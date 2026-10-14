import { currentMember, currentStaff } from "@/server/current";
import { unreadReplies } from "@/server/messages";
import { ContactButton } from "./ContactButton";

/**
 * Decides on the server who sees the contact button:
 * members (with their unread replies) and visitors (invited to sign in).
 * A signed-in staff account, which has the inbox, doesn't need it.
 */
export async function ContactWidget() {
  const [member, staff] = await Promise.all([currentMember(), currentStaff()]);
  if (!member && staff) return null;

  const unread = member ? await unreadReplies(member.code) : 0;
  return <ContactButton member={member ? { code: member.code, unread } : null} />;
}
