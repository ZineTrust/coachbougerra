/*
  Copies the whole Coach Bougerra database from one Postgres to another (for example from the Render
  database that is about to disappear to a new Supabase one), then checks that every table matches.

    node --env-file=.env.local scripts/copy-database.mjs --check     read the old database, change nothing
    node --env-file=.env.local scripts/copy-database.mjs             copy old -> new

  Addresses (put them in .env.local, never in a chat or in git):
    OLD_DATABASE_URL   the database to read     (Render: "External Database URL")
    NEW_DATABASE_URL   the database to fill     (Supabase: "Session pooler" connection string)
  For a rehearsal on this computer an address can be  pglite:<folder>  instead of a postgres:// URL.

  What it does, in order:
    1. builds the tables in the new database from the site's own schema (src/server/schema.ts);
    2. in ONE transaction: copies every table in foreign-key order, keeping the exact text of every value
       (dates with microseconds, JSON, numbers), then moves the serial counters past the copied rows;
    3. compares every table (row count + a fingerprint of every row) and only COMMITS if they all match.
  Nothing is ever written to the old database. The new database must be empty unless --replace is given.
*/
import { SCHEMA } from "../src/server/schema.ts";

const args = new Set(process.argv.slice(2));
const CHECK = args.has("--check");
const REPLACE = args.has("--replace");
const BATCH = 2000;

const qi = (name) => `"${String(name).replaceAll('"', '""')}"`;

/** Which server an address points at, without the password. */
function describe(url) {
  if (url.startsWith("pglite:")) return `embedded database in ${url.slice(7)}`;
  try {
    const u = new URL(url);
    return `${u.hostname}${u.port ? ":" + u.port : ""}${u.pathname}`;
  } catch {
    return "(unreadable address)";
  }
}

/** One connection with the same small interface for a real Postgres and for the embedded one. */
async function open(url) {
  if (url.startsWith("pglite:")) {
    const { PGlite } = await import("@electric-sql/pglite");
    const pg = new PGlite(url.slice(7));
    await pg.waitReady;
    await pg.exec("set time zone 'UTC'");
    return {
      query: async (sql, params) => (await pg.query(sql, params)).rows,
      exec: async (sql) => void (await pg.exec(sql)),
      close: async () => pg.close(),
    };
  }
  const { default: pg } = await import("pg");
  const local = /@(localhost|127\.0\.0\.1)/.test(url);
  const client = new pg.Client({ connectionString: url, ssl: local ? undefined : { rejectUnauthorized: false } });
  await client.connect();
  await client.query("set time zone 'UTC'");
  return {
    query: async (sql, params) => (await client.query(sql, params)).rows,
    exec: async (sql) => void (await client.query(sql)),
    close: async () => client.end(),
  };
}

const publicTables = async (c) =>
  (await c.query(`select tablename from pg_tables where schemaname = 'public' order by tablename`)).map((r) => r.tablename);

const columnsOf = async (c, table) =>
  (
    await c.query(
      `select column_name from information_schema.columns
        where table_schema = 'public' and table_name = $1 and is_generated = 'NEVER' order by ordinal_position`,
      [table],
    )
  ).map((r) => r.column_name);

/** Tables in an order where every table comes after the ones it points at. Self-pointing tables are noted. */
async function copyOrder(c, tables) {
  const fks = await c.query(
    `select cl.relname as child, pr.relname as parent
       from pg_constraint k
       join pg_class cl on cl.oid = k.conrelid
       join pg_class pr on pr.oid = k.confrelid
       join pg_namespace n on n.oid = cl.relnamespace
      where k.contype = 'f' and n.nspname = 'public'`,
  );
  const set = new Set(tables);
  const parents = new Map(tables.map((t) => [t, new Set()]));
  const selfRef = new Set();
  for (const { child, parent } of fks) {
    if (!set.has(child) || !set.has(parent)) continue;
    if (child === parent) selfRef.add(child);
    else parents.get(child).add(parent);
  }
  const order = [];
  const done = new Set();
  const visiting = new Set();
  const visit = (t) => {
    if (done.has(t)) return;
    if (visiting.has(t)) throw new Error(`tables point at each other in a circle (${t}): cannot order the copy`);
    visiting.add(t);
    for (const p of parents.get(t)) visit(p);
    visiting.delete(t);
    done.add(t);
    order.push(t);
  };
  for (const t of tables) visit(t);
  return { order, selfRef };
}

/**
 * A slice of a table as JSON text exactly as the database writes it (exact dates, numbers, bytea as \x…).
 * The text is never parsed here, so nothing can be rounded on the way (a number beyond 2^53, say).
 */
const readSlice = async (c, table, cols, offset, limit) =>
  (
    await c.query(
      `select coalesce(json_agg(x), '[]'::json)::text as j
         from (select ${cols.map(qi).join(", ")} from ${qi(table)} order by ctid limit ${limit} offset ${offset}) x`,
    )
  )[0].j;

const countRows = async (c, table) => (await c.query(`select count(*)::int as n from ${qi(table)}`))[0].n;

/** Row count + one fingerprint over every row, computed the same way on both sides. */
async function fingerprint(c, table, cols) {
  const [r] = await c.query(
    `select count(*)::int as n,
            coalesce(md5(string_agg(h, '' order by h)), '') as sig
       from (select md5(row(${cols.map(qi).join(", ")})::text) as h from ${qi(table)}) x`,
  );
  return { n: r.n, sig: r.sig };
}

async function main() {
  const oldUrl = process.env.OLD_DATABASE_URL;
  const newUrl = process.env.NEW_DATABASE_URL;
  if (!oldUrl || (!CHECK && !newUrl)) {
    console.error("Missing address: set OLD_DATABASE_URL" + (CHECK ? "" : " and NEW_DATABASE_URL") + " in .env.local (see the top of this file).");
    process.exit(2);
  }
  if (!CHECK && oldUrl === newUrl) {
    console.error("OLD and NEW point at the same database: stopping.");
    process.exit(2);
  }

  console.log(`Old database: ${describe(oldUrl)}`);
  const src = await open(oldUrl);
  const srcTables = await publicTables(src);
  if (srcTables.length === 0) throw new Error("The old database has no tables (wrong address, or already emptied).");

  if (CHECK) {
    console.log("Reading the old database only (nothing is changed):");
    for (const t of srcTables) {
      const cols = await columnsOf(src, t);
      const f = await fingerprint(src, t, cols);
      console.log(`  ${t.padEnd(28)} ${String(f.n).padStart(7)} rows`);
    }
    await src.close();
    return;
  }

  console.log(`New database: ${describe(newUrl)}`);
  const dst = await open(newUrl);

  console.log("Building the tables in the new database…");
  await dst.exec(SCHEMA);
  const dstTables = await publicTables(dst);

  const skipped = srcTables.filter((t) => !dstTables.includes(t));
  const tables = srcTables.filter((t) => dstTables.includes(t));
  if (skipped.length) console.log(`Not copied (the site no longer has these tables): ${skipped.join(", ")}`);

  // the new database must be empty (apart from the two starting rows the schema adds)
  const members = (await dst.query(`select count(*)::int as n from members`))[0].n;
  const staff = (await dst.query(`select count(*)::int as n from staff`))[0].n;
  if ((members > 0 || staff > 0) && !REPLACE) {
    throw new Error(
      `The new database already has ${members} members and ${staff} staff accounts. Stopping so nothing is overwritten. ` +
        `If it only holds test data you can throw away, run again with --replace.`,
    );
  }

  const { order, selfRef } = await copyOrder(dst, tables);

  await dst.exec("begin");
  try {
    if (REPLACE) await dst.exec(`truncate ${tables.map(qi).join(", ")} restart identity cascade`);
    else await dst.exec(`delete from counters; delete from live_status;`); // the schema's starting rows: the old ones win

    const report = [];
    for (const t of order) {
      const sCols = await columnsOf(src, t);
      const dCols = await columnsOf(dst, t);
      const cols = sCols.filter((c) => dCols.includes(c)); // a column the old database lacks keeps its default
      const lost = sCols.filter((c) => !dCols.includes(c));
      const n = await countRows(src, t);
      const size = selfRef.has(t) ? Math.max(n, 1) : BATCH; // a table pointing at itself goes in one statement
      for (let i = 0; i < n; i += size) {
        await dst.query(
          `insert into ${qi(t)} (${cols.map(qi).join(", ")})
           select ${cols.map(qi).join(", ")} from json_populate_recordset(null::${qi(t)}, $1::json)`,
          [await readSlice(src, t, cols, i, size)],
        );
      }
      report.push({ t, cols, lost, n });
    }

    // serial counters continue after the highest copied id
    for (const t of tables) {
      for (const c of await columnsOf(dst, t)) {
        const [s] = await dst.query(`select pg_get_serial_sequence($1, $2) as seq`, [`public.${qi(t)}`, c]);
        if (!s?.seq) continue;
        await dst.query(
          `select setval($1::regclass, coalesce((select max(${qi(c)}) from ${qi(t)}), 1), (select max(${qi(c)}) from ${qi(t)}) is not null)`,
          [s.seq],
        );
      }
    }

    // compare everything before committing
    let bad = 0;
    console.log("\nTable                          old rows    new rows   match");
    for (const { t, cols, lost } of report) {
      const a = await fingerprint(src, t, cols);
      const b = await fingerprint(dst, t, cols);
      const ok = a.n === b.n && a.sig === b.sig;
      if (!ok) bad++;
      console.log(
        `${t.padEnd(30)} ${String(a.n).padStart(8)} ${String(b.n).padStart(11)}   ${ok ? "yes" : "NO"}` +
          (lost.length ? `   (old columns not in the new schema: ${lost.join(", ")})` : ""),
      );
    }
    if (bad) throw new Error(`${bad} table(s) do not match: nothing was kept.`);

    await dst.exec("commit");
    const total = report.reduce((s, r) => s + r.n, 0);
    console.log(`\nDone: ${total} rows in ${report.length} tables copied and verified. The new database is ready.`);
  } catch (error) {
    await dst.exec("rollback").catch(() => {});
    throw error;
  } finally {
    await src.close();
    await dst.close();
  }
}

main().catch((error) => {
  console.error("\nSTOPPED:", error instanceof Error ? error.message : error);
  process.exit(1);
});
