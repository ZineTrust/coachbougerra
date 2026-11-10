import "server-only";
import { db } from "../db";

/* The assistant's conversations, notes and the numbers the owner looks at. */

export interface StoredMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  rating: number | null;
  createdAt: Date;
}

const ALGIERS_OFFSET_MS = 60 * 60_000;

/** The start of today in Algiers time (UTC+1, no daylight saving), as a real instant. */
function startOfAlgiersDay(now = new Date()): Date {
  const wall = new Date(now.getTime() + ALGIERS_OFFSET_MS);
  return new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate()) - ALGIERS_OFFSET_MS);
}

/** How many questions this member asked today. */
export async function questionsToday(code: number): Promise<number> {
  const database = await db();
  const [row] = await database.query<{ n: number }>(
    `select count(*)::int as n
       from assistant_messages m join assistant_chats c on c.id = m.chat_id
      where c.member_code = $1::int and m.role = 'user' and m.created_at >= $2`,
    [code, startOfAlgiersDay()],
  );
  return row?.n ?? 0;
}

/** The member's latest conversation if it is still fresh (a day), with its messages; otherwise null. */
export async function latestChat(code: number): Promise<{ id: number; messages: StoredMessage[] } | null> {
  const database = await db();
  const [chat] = await database.query<{ id: number }>(
    `select id from assistant_chats
      where member_code = $1::int and updated_at > now() - interval '1 day'
      order by id desc limit 1`,
    [code],
  );
  if (!chat) return null;
  return { id: chat.id, messages: await chatMessages(chat.id, 40) };
}

export async function chatMessages(chatId: number, limit: number): Promise<StoredMessage[]> {
  const database = await db();
  const rows = await database.query<{
    id: number;
    role: "user" | "assistant";
    content: string;
    rating: number | null;
    created_at: Date;
  }>(
    `select id, role, content, rating, created_at from assistant_messages
      where chat_id = $1::int and content <> ''
      order by id desc limit $2::int`,
    [chatId, limit],
  );
  return rows.reverse().map((r) => ({ id: r.id, role: r.role, content: r.content, rating: r.rating, createdAt: r.created_at }));
}

export async function chatBelongsTo(chatId: number, code: number): Promise<boolean> {
  const database = await db();
  const rows = await database.query("select 1 from assistant_chats where id = $1::int and member_code = $2::int", [chatId, code]);
  return rows.length > 0;
}

export async function createChat(code: number): Promise<number> {
  const database = await db();
  const [row] = await database.query<{ id: number }>(
    "insert into assistant_chats (member_code) values ($1::int) returning id",
    [code],
  );
  return row.id;
}

export async function addMessage(chatId: number, role: "user" | "assistant", content: string): Promise<number> {
  const database = await db();
  const [row] = await database.query<{ id: number }>(
    "insert into assistant_messages (chat_id, role, content) values ($1::int, $2, $3) returning id",
    [chatId, role, content],
  );
  await database.query("update assistant_chats set updated_at = now() where id = $1::int", [chatId]);
  return row.id;
}

/** The answer is complete: store its text, the model that gave it, and whether little knowledge matched. */
export async function finishAnswer(id: number, content: string, model: string, weak: boolean) {
  const database = await db();
  await database.query("update assistant_messages set content = $2, model = $3, weak = $4 where id = $1::int", [
    id,
    content,
    model,
    weak,
  ]);
}

export async function deleteMessages(ids: number[]) {
  if (ids.length === 0) return;
  const database = await db();
  await database.query("delete from assistant_messages where id in (select jsonb_array_elements_text($1::jsonb)::int)", [
    JSON.stringify(ids),
  ]);
}

/** A member's thumb on an answer of theirs. False when the answer is not theirs. */
export async function rateAnswer(code: number, messageId: number, rating: 1 | -1 | null): Promise<boolean> {
  const database = await db();
  const rows = await database.query(
    `update assistant_messages m set rating = $3::smallint
       from assistant_chats c
      where m.id = $2::int and m.chat_id = c.id and c.member_code = $1::int and m.role = 'assistant'
      returning m.id`,
    [code, messageId, rating],
  );
  return rows.length > 0;
}

/* ------------------------------ the owner's view ------------------------------ */

export interface ReviewRow {
  id: number;
  memberCode: number;
  question: string;
  answer: string;
  rating: number | null;
  weak: boolean;
  model: string | null;
  createdAt: Date;
}

/** Answers that were thumbed down or given with little matching knowledge, newest first. */
export async function answersToReview(limit: number): Promise<ReviewRow[]> {
  const database = await db();
  const rows = await database.query<{
    id: number;
    member_code: number;
    question: string | null;
    answer: string;
    rating: number | null;
    weak: boolean;
    model: string | null;
    created_at: Date;
  }>(
    `select m.id, c.member_code, m.content as answer, m.rating, m.weak, m.model, m.created_at,
            (select q.content from assistant_messages q
              where q.chat_id = m.chat_id and q.role = 'user' and q.id < m.id
              order by q.id desc limit 1) as question
       from assistant_messages m join assistant_chats c on c.id = m.chat_id
      where m.role = 'assistant' and m.content <> '' and (m.rating = -1 or m.weak)
      order by m.id desc limit $1::int`,
    [limit],
  );
  return rows.map((r) => ({
    id: r.id,
    memberCode: r.member_code,
    question: r.question ?? "",
    answer: r.answer,
    rating: r.rating,
    weak: r.weak,
    model: r.model,
    createdAt: r.created_at,
  }));
}

export interface AssistantStats {
  today: number;
  last30: number;
  up: number;
  down: number;
  weak: number;
  members: number;
}

export async function assistantStats(): Promise<AssistantStats> {
  const database = await db();
  const [row] = await database.query<AssistantStats>(
    `select
       count(*) filter (where m.role = 'user' and m.created_at >= $1)::int as today,
       count(*) filter (where m.role = 'user' and m.created_at > now() - interval '30 days')::int as "last30",
       count(*) filter (where m.rating = 1)::int as up,
       count(*) filter (where m.rating = -1)::int as down,
       count(*) filter (where m.weak and m.role = 'assistant' and m.created_at > now() - interval '30 days')::int as weak,
       (select count(distinct c2.member_code)::int from assistant_chats c2 where c2.updated_at > now() - interval '30 days') as members
       from assistant_messages m`,
    [startOfAlgiersDay()],
  );
  return row ?? { today: 0, last30: 0, up: 0, down: 0, weak: 0, members: 0 };
}

/* ---------------------------------- notes ---------------------------------- */

export interface NoteRecord {
  id: number;
  title: string;
  keywords: string;
  body: string;
  enabled: boolean;
  updatedAt: Date;
}

interface NoteRow {
  id: number;
  title: string;
  keywords: string;
  body: string;
  enabled: boolean;
  updated_at: Date;
}

const toNote = (r: NoteRow): NoteRecord => ({
  id: r.id,
  title: r.title,
  keywords: r.keywords,
  body: r.body,
  enabled: r.enabled,
  updatedAt: r.updated_at,
});

export async function listNotes(): Promise<NoteRecord[]> {
  const database = await db();
  const rows = await database.query<NoteRow>(
    "select id, title, keywords, body, enabled, updated_at from assistant_notes order by updated_at desc, id desc",
  );
  return rows.map(toNote);
}

export async function getNote(id: number): Promise<NoteRecord | null> {
  const database = await db();
  const [row] = await database.query<NoteRow>(
    "select id, title, keywords, body, enabled, updated_at from assistant_notes where id = $1::int",
    [id],
  );
  return row ? toNote(row) : null;
}

export async function saveNote(
  id: number | null,
  input: { title: string; keywords: string; body: string; enabled: boolean },
  staffId: number,
): Promise<number> {
  const database = await db();
  if (id === null) {
    const [row] = await database.query<{ id: number }>(
      `insert into assistant_notes (title, keywords, body, enabled, created_by)
       values ($1, $2, $3, $4, $5::int) returning id`,
      [input.title, input.keywords, input.body, input.enabled, staffId],
    );
    return row.id;
  }
  await database.query(
    `update assistant_notes set title = $2, keywords = $3, body = $4, enabled = $5, updated_at = now()
      where id = $1::int`,
    [id, input.title, input.keywords, input.body, input.enabled],
  );
  return id;
}

export async function deleteNote(id: number) {
  const database = await db();
  await database.query("delete from assistant_notes where id = $1::int", [id]);
}

export async function enabledNotes(): Promise<NoteRecord[]> {
  const database = await db();
  const rows = await database.query<NoteRow>(
    "select id, title, keywords, body, enabled, updated_at from assistant_notes where enabled order by id",
  );
  return rows.map(toNote);
}
