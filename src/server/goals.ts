import "server-only";
import { db } from "./db";

/*
  A member's own PV goal for a month. See the `member_goals` table: it is personal tracking and
  unlocks nothing (the team verifies PV on Ultimate before a formation is unlocked).
*/

export interface Goal {
  month: string;
  targetPv: number;
  currentPv: number;
}

interface Row {
  month: string;
  target_pv: number;
  current_pv: number;
}

const toGoal = (r: Row): Goal => ({ month: r.month, targetPv: r.target_pv, currentPv: r.current_pv });

export async function getGoal(code: number, month: string): Promise<Goal | null> {
  const database = await db();
  const [row] = await database.query<Row>(
    "select month, target_pv, current_pv from member_goals where member_code = $1::int and month = $2",
    [code, month],
  );
  return row ? toGoal(row) : null;
}

/** The goal of the month before, to show how it went. */
export async function getPreviousGoal(code: number, before: string): Promise<Goal | null> {
  const database = await db();
  const [row] = await database.query<Row>(
    `select month, target_pv, current_pv from member_goals
      where member_code = $1::int and month < $2
      order by month desc limit 1`,
    [code, before],
  );
  return row ? toGoal(row) : null;
}

/** Sets (or changes) the target of a month; the PV already counted are kept. */
export async function saveTarget(code: number, month: string, target: number) {
  const database = await db();
  await database.query(
    `insert into member_goals (member_code, month, target_pv) values ($1::int, $2, $3::int)
     on conflict (member_code, month)
     do update set target_pv = excluded.target_pv, updated_at = now()`,
    [code, month, target],
  );
}

/** Records the PV made so far this month. False when there is no goal yet for the month. */
export async function saveProgress(code: number, month: string, current: number): Promise<boolean> {
  const database = await db();
  const rows = await database.query(
    `update member_goals set current_pv = $3::int, updated_at = now()
      where member_code = $1::int and month = $2
      returning month`,
    [code, month, current],
  );
  return rows.length > 0;
}
