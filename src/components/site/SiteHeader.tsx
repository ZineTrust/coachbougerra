import { currentMember, currentStaff } from "@/server/current";
import { avatarVersion } from "@/server/engagement";
import { groupsBadge } from "@/server/groups";
import { unreadCount } from "@/server/notifications";
import { Navbar } from "./Navbar";

/** Reads who is signed in on the server, so the menu is right from the first paint. */
export async function SiteHeader() {
  const [member, staff] = await Promise.all([currentMember(), currentStaff()]);
  const [unread, photoVersion, groups] = member
    ? await Promise.all([unreadCount(member.code), avatarVersion(member.code), groupsBadge(member.code)])
    : [0, null, 0];

  return (
    <Navbar
      member={
        member
          ? {
              code: member.code,
              unread,
              name: member.fullName ?? String(member.code),
              photoVersion,
              groups,
            }
          : null
      }
      isStaff={Boolean(staff)}
    />
  );
}
