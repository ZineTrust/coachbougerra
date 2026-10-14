import "server-only";
import webpush from "web-push";
import { db } from "./db";

/*
  Web push: notifications that reach a member's phone or computer even when the
  site is closed. A member agrees on each device; we keep one subscription per
  device and drop it when the push service says it is gone.
*/

let configured: boolean | undefined;

function configure() {
  if (configured !== undefined) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
  if (!publicKey || !privateKey) {
    console.warn("[coach-bougerra] Push notifications are off: set VAPID keys in the environment.");
    return (configured = false);
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return (configured = true);
}

export const pushEnabled = () => configure();

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function saveSubscription(code: number, sub: PushSubscriptionInput) {
  const database = await db();
  await database.query(
    `insert into push_subscriptions (member_code, endpoint, p256dh, auth)
     values ($1, $2, $3, $4)
     on conflict (endpoint) do update set member_code = excluded.member_code,
       p256dh = excluded.p256dh, auth = excluded.auth`,
    [code, sub.endpoint, sub.p256dh, sub.auth],
  );
}

export async function removeSubscription(code: number, endpoint: string) {
  const database = await db();
  await database.query("delete from push_subscriptions where member_code = $1 and endpoint = $2", [
    code,
    endpoint,
  ]);
}

export async function hasSubscription(code: number, endpoint: string) {
  const database = await db();
  const [row] = await database.query(
    "select 1 from push_subscriptions where member_code = $1 and endpoint = $2",
    [code, endpoint],
  );
  return Boolean(row);
}

export interface PushPayload {
  title: string;
  body: string;
  /** where a tap leads (a path without language: the site picks the member's language) */
  url?: string;
}

/**
 * Sends a notification to everyone, or only to these member codes. Never throws:
 * a failing push must not break the action that triggered it.
 */
export async function sendPush(audience: "all" | number[], payload: PushPayload) {
  try {
    if (!configure()) return { sent: 0, removed: 0 };
    const database = await db();
    const rows =
      audience === "all"
        ? await database.query<{ endpoint: string; p256dh: string; auth: string }>(
            "select endpoint, p256dh, auth from push_subscriptions",
          )
        : audience.length === 0
          ? []
          : await database.query<{ endpoint: string; p256dh: string; auth: string }>(
              `select endpoint, p256dh, auth from push_subscriptions
                where member_code in (select jsonb_array_elements_text($1::jsonb)::int)`,
              [JSON.stringify(audience)],
            );

    const body = JSON.stringify({ ...payload, url: payload.url ?? "/compte" });
    const gone: string[] = [];
    let sent = 0;

    // a few at a time, so a big audience doesn't open thousands of connections at once
    const BATCH = 20;
    for (let i = 0; i < rows.length; i += BATCH) {
      const results = await Promise.allSettled(
        rows.slice(i, i + BATCH).map((r) =>
          webpush.sendNotification(
            { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
            body,
            { TTL: 60 * 60 * 24 },
          ),
        ),
      );
      results.forEach((res, j) => {
        if (res.status === "fulfilled") sent++;
        else {
          const status = (res.reason as { statusCode?: number })?.statusCode;
          // 404 / 410: the device unsubscribed or the browser data was cleared
          if (status === 404 || status === 410) gone.push(rows[i + j].endpoint);
        }
      });
    }

    if (gone.length > 0) {
      await database.query(
        "delete from push_subscriptions where endpoint in (select jsonb_array_elements_text($1::jsonb))",
        [JSON.stringify(gone)],
      );
    }
    return { sent, removed: gone.length };
  } catch (error) {
    console.error("[coach-bougerra] push failed", error);
    return { sent: 0, removed: 0 };
  }
}
