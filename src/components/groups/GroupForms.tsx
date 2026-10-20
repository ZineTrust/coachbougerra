"use client";

import { useActionState, useTransition } from "react";
import { Check, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  answerInvitationAction,
  createGroupAction,
  createOfficialGroupAction,
  updateOfficialGroupAction,
} from "@/actions/groups";
import { initialState } from "@/actions/types";
import { Button } from "@/components/ui/Button";
import { CheckRow, Field, Notice, useErrorText } from "@/components/ui/form";
import { useRouter } from "@/i18n/navigation";
import { GROUP_DESCRIPTION_MAX, GROUP_NAME_MAX, MAX_FRIEND_GROUPS_PER_MEMBER } from "@/lib/groups";
import { MEMBER_TITLES, type MemberTitle } from "@/lib/permissions";

/** Member: start a group of friends. On success the server sends them to the new group. */
export function CreateGroupForm() {
  const t = useTranslations("groups");
  const err = useErrorText();
  const [state, action, pending] = useActionState(createGroupAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <Field
        label={t("nameLabel")}
        name="name"
        maxLength={GROUP_NAME_MAX}
        required
        defaultValue={state.values?.name}
        placeholder={t("namePlaceholder")}
        error={err(state.errors?.name)}
      />
      <Field
        label={`${t("descriptionLabel")} (${t("optional")})`}
        name="description"
        maxLength={GROUP_DESCRIPTION_MAX}
        defaultValue={state.values?.description}
        placeholder={t("descriptionPlaceholder")}
        error={err(state.errors?.description)}
      />
      {state.errors?.form && <Notice tone="error">{err(state.errors.form)}</Notice>}
      <Button type="submit" disabled={pending} className="w-full">
        <Plus className="size-[18px]" aria-hidden /> {t("create")}
      </Button>
      <p className="text-[0.8125rem] leading-snug text-ink-500">
        {t("createHelp", { max: MAX_FRIEND_GROUPS_PER_MEMBER })}
      </p>
    </form>
  );
}

export interface InvitationItem {
  groupId: number;
  name: string;
  description: string | null;
  inviterCode: number | null;
  inviterName: string | null;
}

/** Member: invitations waiting for an answer. */
export function InvitationList({ invitations }: { invitations: InvitationItem[] }) {
  const t = useTranslations("groups");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const answer = (groupId: number, accept: boolean) =>
    startTransition(async () => {
      const result = await answerInvitationAction(groupId, accept);
      if (result.ok && accept) router.push(`/groupes/${groupId}`);
      else router.refresh();
    });

  return (
    <ul className="space-y-3">
      {invitations.map((inv) => (
        <li
          key={inv.groupId}
          className="flex flex-col gap-3 rounded-2xl bg-gold-100/70 p-4 ring-1 ring-gold-300/60 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div className="min-w-0">
            <p dir="auto" className="font-bold leading-snug">
              {inv.name}
            </p>
            <p className="mt-0.5 text-sm text-ink-600">
              {inv.inviterName
                ? t("invitedBy", { name: inv.inviterName })
                : t("invitedByCode", { code: inv.inviterCode ?? 0 })}
            </p>
            {inv.description && (
              <p dir="auto" className="mt-1 text-sm text-ink-500">
                {inv.description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" disabled={pending} onClick={() => answer(inv.groupId, true)}>
              <Check className="size-4" strokeWidth={3} aria-hidden /> {t("accept")}
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => answer(inv.groupId, false)}>
              <X className="size-4" aria-hidden /> {t("decline")}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Team: make an official group (create) or change one (edit). Ranks ticked here are in the group
 * automatically, now and for members who register later.
 */
export function OfficialGroupForm({
  mode,
  groupId,
  name,
  description,
  titles,
  membersCanPost,
}: {
  mode: "create" | "edit";
  groupId?: number;
  name?: string;
  description?: string | null;
  titles?: MemberTitle[];
  membersCanPost?: boolean;
}) {
  const t = useTranslations("space.groups");
  const g = useTranslations("groups");
  const tt = useTranslations("titles");
  const err = useErrorText();
  const [state, action, pending] = useActionState(
    mode === "create" ? createOfficialGroupAction : updateOfficialGroupAction,
    initialState,
  );

  // after an error the form keeps what was typed; otherwise it shows the group's current settings
  const ticked: string[] = state.values?.titles !== undefined ? state.values.titles.split(",") : (titles ?? []);
  const canPost =
    state.values?.membersCanPost !== undefined ? state.values.membersCanPost === "on" : (membersCanPost ?? true);
  const codesField = mode === "create" ? "codes" : "addCodes";

  return (
    <form action={action} className="space-y-4">
      {groupId !== undefined && <input type="hidden" name="groupId" value={groupId} />}
      <Field
        label={g("nameLabel")}
        name="name"
        maxLength={GROUP_NAME_MAX}
        required
        defaultValue={state.values?.name ?? name}
        placeholder={t("namePlaceholder")}
        error={err(state.errors?.name)}
      />
      <Field
        label={`${g("descriptionLabel")} (${g("optional")})`}
        name="description"
        maxLength={GROUP_DESCRIPTION_MAX}
        defaultValue={state.values?.description ?? description ?? ""}
        error={err(state.errors?.description)}
      />

      <fieldset>
        <legend className="text-sm font-semibold text-ink-700">{t("ranksLabel")}</legend>
        <p className="mt-0.5 text-[0.8125rem] leading-snug text-ink-500">{t("ranksHelp")}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {MEMBER_TITLES.map((title) => (
            <CheckRow
              key={`${title}-${ticked.includes(title)}`}
              name="title"
              value={title}
              label={tt(title)}
              defaultChecked={ticked.includes(title)}
            />
          ))}
        </div>
      </fieldset>

      <Field
        label={mode === "create" ? t("codesLabel") : t("addCodesLabel")}
        hint={t("codesHint")}
        name={codesField}
        inputMode="numeric"
        autoComplete="off"
        ltr
        defaultValue={state.ok ? "" : state.values?.codes}
        error={err(state.errors?.[codesField], state.info)}
      />

      <CheckRow
        key={`post-${canPost}`}
        name="membersCanPost"
        value="on"
        label={t("canPostLabel")}
        help={t("canPostHelp")}
        defaultChecked={canPost}
      />

      {state.errors?.form && <Notice tone="error">{err(state.errors.form)}</Notice>}
      {state.ok && (
        <Notice tone="success">
          {t("settingsSaved")} {Number(state.info?.added) > 0 ? t("addedMembers", { count: Number(state.info?.added) }) : ""}
        </Notice>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {mode === "create" ? (
          <>
            <Plus className="size-[18px]" aria-hidden /> {t("create")}
          </>
        ) : (
          t("saveSettings")
        )}
      </Button>
    </form>
  );
}
