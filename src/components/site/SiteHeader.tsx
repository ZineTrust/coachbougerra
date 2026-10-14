import { currentMember, currentStaff } from "@/server/current";
import { avatarVersion } from "@/server/engagement";
import { unreadCount } from "@/server/notifications";
import { Navbar } from "./Navbar";

/** Reads who is signed in on the server, so the menu is right from the first paint. */
export async function SiteHeader() {
  const [member, staff] = await Promise.all([currentMember(), currentStaff()]);
  const [unread, photoVersion] = member
    ? await Promise.all([unreadCount(member.code), avatarVersion(member.code)])
    : [0, null];

  return (
    <Navbar
      member={
        member
          ? {
              code: member.code,
              unread,
              name: member.fullName ?? String(member.code),
              photoVersion,
            }
          : null
      }
      isStaff={Boolean(staff)}
    />
  );
}
