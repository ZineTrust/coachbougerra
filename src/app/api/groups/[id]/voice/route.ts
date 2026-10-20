import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { VOICE_MAX_BYTES, VOICE_MAX_SECONDS } from "@/lib/groups";
import { currentMember, currentStaff } from "@/server/current";
import { addVoiceMessage, getGroup, groupFor, markRead } from "@/server/groups";
import { allow } from "@/server/rate-limit";
import { can } from "@/server/staff";
import { putFile, storageConfigured } from "@/server/storage";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: NO_STORE });

/** An MP3 starts with an ID3 tag or an MPEG audio frame (11 bits set). */
function looksLikeMp3(bytes: Buffer): boolean {
  if (bytes.length < 4) return false;
  if (bytes.subarray(0, 3).toString("latin1") === "ID3") return true;
  return bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
}

/**
 * A voice note, sent as the raw MP3 in the body (the phone encodes it): ?seconds=<length>, and
 * ?as=team to write as the team. Stored in the object storage and added to the chat as a message.
 * Who may do it is who may write in the group.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const groupId = Number((await params).id);
  if (!Number.isInteger(groupId)) return fail("not_found", 404);
  if (!storageConfigured()) return fail("storage_off", 503);

  const query = request.nextUrl.searchParams;
  const seconds = Number(query.get("seconds"));
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > VOICE_MAX_SECONDS) return fail("voice_invalid", 400);
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > VOICE_MAX_BYTES) return fail("voice_invalid", 413);

  // who is writing, and may they
  let from: { memberCode: number } | { staffId: number };
  let who: string;
  if (query.get("as") === "team") {
    const staff = await currentStaff();
    if (!staff || !can(staff, "groups_manage")) return fail("unauthorized", 401);
    if (!(await getGroup(groupId))) return fail("not_found", 404);
    from = { staffId: staff.id };
    who = `staff:${staff.id}`;
  } else {
    const member = await currentMember();
    if (!member) return fail("unauthorized", 401);
    const access = await groupFor(groupId, member.code);
    if (!access) return fail("not_found", 404);
    if (!access.group.membersCanPost && !access.isAdmin) return fail("cannot_post", 403);
    from = { memberCode: member.code };
    who = `member:${member.code}`;
  }
  if (!allow(`group-voice:${who}`, 12, 60_000)) return fail("too_many_attempts", 429);

  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length === 0 || bytes.length > VOICE_MAX_BYTES || !looksLikeMp3(bytes)) return fail("voice_invalid", 400);

  const key = `voice/${groupId}/${randomUUID()}.mp3`;
  try {
    await putFile(key, bytes, "audio/mpeg");
  } catch (error) {
    console.error("[voice] could not store a voice note:", error);
    return fail("voice_failed", 502);
  }
  const id = await addVoiceMessage(groupId, from, key, seconds);
  if ("memberCode" in from) await markRead(groupId, from.memberCode, id);
  return NextResponse.json({ ok: true, id }, { headers: NO_STORE });
}
