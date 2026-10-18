"use client";

import { useActionState, useTransition } from "react";
import { LogOut, Send, Trash2, UserMinus } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  deleteGroupAction,
  inviteAction,
  leaveGroupAction,
  removeMemberAction,
  renameGroupAction,
  staffDeleteGroupAction,
  staffRemoveGroupMemberAction,
} from "@/actions/groups";
import { initialState } from "@/actions/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Notice, useErrorText } from "@/components/ui/form";
import { useRouter } from "@/i18n/navigation";
import { GROUP_DESCRIPTION_MAX, GROUP_NAME_MAX, type GroupKind } from "@/lib/groups";
import type { MemberTitle } from "@/lib/permissions";

export interface PanelMember {
  code: number;
  name: string | null;
  city: string | null;
  title: MemberTitle;
  isAdmin: boolean;
  status: "member" | "invited";
  /** added one by one, not only in through their rank */
  explicit: boolean;
}

/**
 * Next to a chat: who is in the group, and what the person looking at it may do.
 * Members: the admin of a group of friends invites by code, renames, removes people; anyone
 * in a group of friends can leave. The team: remove members and delete groups.
 */
export function GroupPanel({
  groupId,
  kind,
  mode,
  isAdmin,
  selfCode,
  name,
  description,
  members,
}: {
  groupId: number;
  kind: GroupKind;
  mode: "member" | "team";
  isAdmin: boolean;
  selfCode: number | null;
  name: string;
  description: string | null;
  members: PanelMember[];
}) {
  const t = useTranslations("groups");
  const tt = useTranslations("titles");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const friends = kind === "friends";
  const canManage = mode === "member" && isAdmin && friends;

  const run = (confirmText: string | null, action: () => Promise<unknown>) => {
    if (confirmText && !window.confirm(confirmText)) return;
    startTransition(async () => {
      await action();
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-900/5">
        <h2 className="text-base font-bold">
          {t("membersTitle")} <span className="text-sm font-semibold text-ink-400">{members.length}</span>
        </h2>
        <ul className="mt-4 max-h-80 space-y-1 overflow-y-auto">
          {members.map((m) => {
            // the team can remove people added one by one; someone in by rank is changed through the ranks
            const removable = (canManage && m.code !== selfCode) || (mode === "team" && m.explicit);
            return (
              <li key={m.code} className="flex items-center gap-3 rounded-xl px-2 py-2">
                <span className="min-w-0 flex-1">
                  <span dir="auto" className="flex flex-wrap items-center gap-x-2 text-sm font-semibold">
                    {m.name ?? t("memberN", { code: m.code })}
                    <span dir="ltr" className="text-xs font-medium text-ink-400">
                      #{m.code}
                    </span>
                  </span>
                  <span className="block text-xs text-ink-500">
                    {tt(m.title)}
                    {m.city ? ` · ${m.city}` : ""}
                  </span>
                </span>
                {m.isAdmin && <Badge tone="premium">{t("admin")}</Badge>}
                {m.status === "invited" && <Badge tone="neutral">{t("pendingInvite")}</Badge>}
                {removable && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(t("removeMemberConfirm"), () =>
                        mode === "team"
                          ? staffRemoveGroupMemberAction(groupId, m.code)
                          : removeMemberAction(groupId, m.code),
                      )
                    }
                    className="grid size-8 shrink-0 place-items-center rounded-full text-ink-400 hover:bg-ivory-100 hover:text-live disabled:opacity-50"
                    aria-label={t("remove")}
                    title={t("remove")}
                  >
                    <UserMinus className="size-4" aria-hidden />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {kind === "official" && (
          <p className="mt-3 text-[13px] leading-snug text-ink-500">{t("byRankNote")}</p>
        )}
      </section>

      {canManage && <InviteForm groupId={groupId} />}
      {canManage && <RenameForm groupId={groupId} name={name} description={description} />}

      {(mode === "member" && friends) || mode === "team" || canManage ? (
        <section className="space-y-3 rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-900/5">
          {mode === "member" && friends && (
            <Button
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={() => run(t("leaveConfirm"), () => leaveGroupAction(groupId))}
            >
              <LogOut className="flip-rtl size-4" aria-hidden /> {t("leave")}
            </Button>
          )}
          {(canManage || mode === "team") && (
            <Button
              variant="danger"
              className="w-full"
              disabled={pending}
              onClick={() =>
                run(t("deleteConfirm"), () =>
                  mode === "team" ? staffDeleteGroupAction(groupId) : deleteGroupAction(groupId),
                )
              }
            >
              <Trash2 className="size-4" aria-hidden /> {t("delete")}
            </Button>
          )}
        </section>
      ) : null}
    </div>
  );
}

function InviteForm({ groupId }: { groupId: number }) {
  const t = useTranslations("groups");
  const err = useErrorText();
  const [state, action, pending] = useActionState(inviteAction, initialState);
  const info = state.info;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-900/5">
      <h2 className="text-base font-bold">{t("inviteTitle")}</h2>
      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="groupId" value={groupId} />
        <Field
          // after a successful invitation the box starts empty again
          key={state.ok ? `done-${JSON.stringify(info)}` : "editing"}
          label={t("inviteLabel")}
          hint={t("inviteHint")}
          name="codes"
          inputMode="numeric"
          autoComplete="off"
          ltr
          defaultValue={state.ok ? "" : state.values?.codes}
          placeholder={t("invitePlaceholder")}
          error={err(state.errors?.codes, info)}
        />
        {state.errors?.form && <Notice tone="error">{err(state.errors.form)}</Notice>}
        {state.ok && info && (
          <div className="space-y-1.5">
            {Number(info.invited) > 0 && <Notice tone="success">{t("inviteDone", { count: Number(info.invited) })}</Notice>}
            {Number(info.already) > 0 && <Notice tone="info">{t("inviteAlready", { count: Number(info.already) })}</Notice>}
            {info.unknown ? <Notice tone="error">{t("inviteUnknown", { list: String(info.unknown) })}</Notice> : null}
            {Number(info.full) > 0 && <Notice tone="error">{t("inviteFull", { count: Number(info.full) })}</Notice>}
          </div>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          <Send className="flip-rtl size-4" aria-hidden /> {t("inviteSend")}
        </Button>
      </form>
    </section>
  );
}

function RenameForm({
  groupId,
  name,
  description,
}: {
  groupId: number;
  name: string;
  description: string | null;
}) {
  const t = useTranslations("groups");
  const err = useErrorText();
  const [state, action, pending] = useActionState(renameGroupAction, initialState);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-900/5">
      <h2 className="text-base font-bold">{t("renameTitle")}</h2>
      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="groupId" value={groupId} />
        <Field
          label={t("nameLabel")}
          name="name"
          maxLength={GROUP_NAME_MAX}
          defaultValue={state.values?.name ?? name}
          error={err(state.errors?.name)}
        />
        <Field
          label={t("descriptionLabel")}
          name="description"
          maxLength={GROUP_DESCRIPTION_MAX}
          defaultValue={state.values?.description ?? description ?? ""}
          error={err(state.errors?.description)}
        />
        {state.errors?.form && <Notice tone="error">{err(state.errors.form)}</Notice>}
        {state.ok && <Notice tone="success">{t("saved")}</Notice>}
        <Button type="submit" variant="outline" disabled={pending} className="w-full">
          {t("save")}
        </Button>
      </form>
    </section>
  );
}
