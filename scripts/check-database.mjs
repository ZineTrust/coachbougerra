/*
  Checks that a Postgres can run the site, before the site is pointed at it:

    node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --env-file=.env.local scripts/check-database.mjs

  Reads NEW_DATABASE_URL (or DATABASE_URL) from the environment (put it in .env.local, never in a chat or in git).
  It connects the way the site does (the `pg` driver), builds the tables from src/server/schema.ts (the same thing
  the site does at start-up), runs the queries the site's layout runs on every page, and does one test write that
  is undone. It prints the server's name, never the password.
*/
import { SCHEMA } from "../src/server/schema.ts";

const url = process.env.NEW_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("Missing address: set NEW_DATABASE_URL in .env.local (the Supabase \"Session pooler\" string).");
  process.exit(2);
}

let host = "(unreadable address)";
try {
  const u = new URL(url);
  host = `${u.hostname}:${u.port || "5432"}`;
  if (/^db\.[a-z0-9]+\.supabase\.co$/.test(u.hostname)) {
    console.log("Note: this is Supabase's \"Direct connection\" address. It only works over IPv6, which Render does not have:");
    console.log("      use the \"Session pooler\" string instead (host like aws-0-eu-central-1.pooler.supabase.com).");
  }
  if (u.port === "6543") {
    console.log("Note: port 6543 is the \"Transaction pooler\". The site is built for the Session pooler (port 5432).");
  }
} catch {
  console.error("The address is not a valid URL. If the password has symbols like @ : / # ? it must be URL-encoded,");
  console.error("or (simpler) use a database password made of letters and digits only.");
  process.exit(2);
}

const { default: pg } = await import("pg");
const local = /@(localhost|127\.0\.0\.1)/.test(url);
const client = new pg.Client({ connectionString: url, ssl: local ? undefined : { rejectUnauthorized: false } });
const step = (name) => console.log(`  ok  ${name}`);

try {
  console.log(`Connecting to ${host} …`);
  await client.connect();
  const [v] = (await client.query("select version() as v, current_user as u, current_database() as d")).rows;
  step(`connected as ${v.u} to database ${v.d} (${v.v.split(" ").slice(0, 2).join(" ")})`);

  await client.query(SCHEMA);
  const tables = (await client.query("select count(*)::int as n from pg_tables where schemaname = 'public'")).rows[0].n;
  step(`tables built from the site's schema (${tables} tables)`);

  const rls = (await client.query(
    "select count(*)::int as n from pg_tables where schemaname = 'public' and not rowsecurity",
  )).rows[0].n;
  step(rls === 0 ? "row-level security is on for every table" : `WARNING: ${rls} table(s) without row-level security`);

  // the queries every page of the site runs (the red "on air" banner)
  await client.query(
    `select id from lives
      where status = 'live' and started_at > now() - make_interval(hours => 12) limit 1`,
  );
  await client.query(
    `select id from lives
      where ((status = 'scheduled' and starts_at + length_min * interval '1 minute' > now())
          or (status = 'live' and started_at > now() - make_interval(hours => 12)))
        and ($1::boolean or access <> 'team')
      order by (status = 'live') desc, starts_at asc limit $2::int`,
    [false, 1],
  );
  step("the lives queries run");

  // one write that is undone: a member row, then a live row, then everything is rolled back
  await client.query("begin");
  await client.query(
    `insert into members (code, email, password_hash, phone, ultimate_code, title)
     values (999999, 'check@example.invalid', 'x', '0000000000', 'CHECK', 'consultant')`,
  );
  await client.query(
    `insert into lives (title_fr, starts_at) values ('check', now() + interval '1 day')`,
  );
  await client.query("rollback");
  step("a test write worked and was undone");

  const [c] = (await client.query("select count(*)::int as members from members")).rows;
  console.log(`\nThis database is ready for the site (members in it now: ${c.members}).`);
} catch (error) {
  await client.query("rollback").catch(() => {});
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nFAILED: ${message}`);
  if (/password authentication failed/i.test(message)) console.error("-> the password in the address is wrong (it must replace [YOUR-PASSWORD]).");
  if (/ENOTFOUND|getaddrinfo/i.test(message)) console.error("-> the server name is wrong or has no IPv4 address: use the Session pooler string.");
  if (/Tenant or user not found/i.test(message)) console.error("-> with the pooler the user must be postgres.<project-ref> exactly as Supabase shows it.");
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
