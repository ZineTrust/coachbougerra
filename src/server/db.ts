import "server-only";
import fs from "node:fs";
import path from "node:path";
import { hashPassword } from "./password";
import { SCHEMA } from "./schema";

/*
  One tiny interface over two Postgres drivers:
    - DATABASE_URL set   -> a real Postgres (Supabase, Render, …) through `pg`
    - otherwise          -> an embedded Postgres (PGlite) stored in .data/pglite
  Both speak the same SQL, so what works locally works in production.
*/

export type Row = Record<string, unknown>;

export interface Queryable {
  query<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
}

export interface Db extends Queryable {
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
}

const globalForDb = globalThis as unknown as { __coachBougerraDb?: Promise<Db> };

/** Lazily opens (once per server process) and prepares the database. */
export function db(): Promise<Db> {
  globalForDb.__coachBougerraDb ??= connect().catch((error) => {
    globalForDb.__coachBougerraDb = undefined; // let the next request retry
    throw error;
  });
  return globalForDb.__coachBougerraDb;
}

async function connect(): Promise<Db> {
  // On a host the built-in database would live on a disk that is wiped at every deploy, so a
  // missing address must be an error, not a silent fallback. Locally (dev), or when a folder is
  // named on purpose with PGLITE_DIR, the built-in database is what we want.
  if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production" && !process.env.PGLITE_DIR) {
    throw new Error(
      "DATABASE_URL is not set: refusing to use the temporary built-in database in production.",
    );
  }
  const database = process.env.DATABASE_URL ? await openPostgres() : await openEmbedded();
  await database.exec(SCHEMA);
  await bootstrapOwner(database);
  return database;
}

async function openEmbedded(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dir, { recursive: true });
  const pg = new PGlite(dir);
  await pg.waitReady;

  return {
    exec: async (sql) => {
      await pg.exec(sql);
    },
    query: async (sql, params) => (await pg.query(sql, params)).rows as never,
    transaction: (fn) =>
      pg.transaction((tx) =>
        fn({ query: async (sql, params) => (await tx.query(sql, params)).rows as never }),
      ),
  };
}

async function openPostgres(): Promise<Db> {
  const { Pool } = await import("pg");
  const url = process.env.DATABASE_URL!;
  const local = /@(localhost|127\.0\.0\.1)/.test(url);
  const pool = new Pool({
    connectionString: url,
    max: 5,
    ssl: local ? undefined : { rejectUnauthorized: false },
  });

  return {
    exec: async (sql) => {
      await pool.query(sql);
    },
    query: async (sql, params) => (await pool.query(sql, params)).rows as never,
    transaction: async (fn) => {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const result = await fn({
          query: async (sql, params) => (await client.query(sql, params)).rows as never,
        });
        await client.query("commit");
        return result;
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

/**
 * The very first start creates Coach Bougerra's owner account from the
 * OWNER_EMAIL / OWNER_PASSWORD environment variables. After that the
 * password lives in the database (change it from the profile page).
 * The owner's display name keeps following OWNER_NAME, so a rebrand carries over.
 */
async function bootstrapOwner(database: Db) {
  const [{ n }] = await database.query<{ n: number }>(
    "select count(*)::int as n from staff where is_owner",
  );
  if (n > 0) {
    const ownerName = process.env.OWNER_NAME?.trim();
    if (ownerName) {
      await database.query("update staff set name = $1 where is_owner and name <> $1", [ownerName]);
    }
    return;
  }

  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD;
  if (!email || !password) {
    console.warn(
      "[coach-bougerra] No owner account yet. Set OWNER_EMAIL and OWNER_PASSWORD, then restart.",
    );
    return;
  }

  await database.query(
    `insert into staff (name, email, password_hash, is_owner)
     values ($1, $2, $3, true)
     on conflict (email) do update set is_owner = true`,
    [process.env.OWNER_NAME?.trim() || "Coach Bougerra", email, await hashPassword(password)],
  );
  console.info(`[coach-bougerra] Owner account created for ${email}`);
}
