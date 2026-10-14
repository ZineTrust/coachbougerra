import { AppShell } from "@/components/app/AppShell";
import { requireStaff } from "@/server/current";
import { unreadConversations } from "@/server/messages";
import { pendingCount } from "@/server/unlocks";
import { can, effectivePermissions } from "@/server/staff";

/** Everything inside the workspace requires a signed-in staff account. */
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const [unreadMessages, pendingRequests] = await Promise.all([
    can(staff, "messages_manage") ? unreadConversations() : 0,
    can(staff, "members_manage") ? pendingCount() : 0,
  ]);

  return (
    <AppShell
      staff={{
        name: staff.name,
        isOwner: staff.isOwner,
        permissions: effectivePermissions(staff),
      }}
      unreadMessages={unreadMessages}
      pendingRequests={pendingRequests}
    >
      {children}
    </AppShell>
  );
}
