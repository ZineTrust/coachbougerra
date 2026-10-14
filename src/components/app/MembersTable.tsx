"use client";

import { useCallback, useState } from "react";
import { KeyRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { Video } from "@/lib/data";
import { GRANT_ALL_LIVES, GRANT_ALL_VIDEOS, type MemberTitle } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { BulkAccessForm, MemberAccessForm } from "./MemberForms";
import { Modal } from "./Modal";

export interface MemberRow {
  code: number;
  fullName: string | null;
  city: string | null;
  email: string;
  phone: string;
  title: MemberTitle;
  ultimateCode: string;
  /** ISO date */
  createdAt: string;
  status: "active" | "suspended";
  grants: string[];
}

type ModalState = { kind: "one"; code: number } | { kind: "bulk"; codes: number[] } | null;

/**
 * The members list with quick access control: a "give access" button on every
 * row, and checkboxes to give the same access to several members at once.
 * Staff without the "manage members" permission just see the list.
 */
export function MembersTable({
  rows,
  premiumVideos,
  canManage,
}: {
  rows: MemberRow[];
  premiumVideos: Video[];
  canManage: boolean;
}) {
  const t = useTranslations("space.members");
  const tt = useTranslations("titles");
  const locale = useLocale() as Locale;

  const [selected, setSelected] = useState<number[]>([]);
  const [modal, setModal] = useState<ModalState>(null);

  // a new search can hide members: only those still on screen stay selected
  const onScreen = rows.map((r) => r.code);
  const chosen = selected.filter((c) => onScreen.includes(c));
  const allChosen = rows.length > 0 && chosen.length === rows.length;

  const toggle = (code: number) =>
    setSelected((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  const clear = useCallback(() => setSelected([]), []);

  const head = [
    t("code"),
    t("name"),
    t("email"),
    t("phone"),
    t("rank"),
    t("ultimateCode"),
    t("registered"),
    t("access"),
  ];
  const openedMember = modal?.kind === "one" ? rows.find((r) => r.code === modal.code) : undefined;

  return (
    <>
      {canManage && chosen.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-jade-100 bg-jade-50 px-4 py-3">
          <p className="text-sm font-bold text-jade-800">{t("selected", { count: chosen.length })}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setModal({ kind: "bulk", codes: chosen })}>
              <KeyRound className="size-4" aria-hidden /> {t("giveSelected")}
            </Button>
            <Button size="sm" variant="outline" onClick={clear}>
              {t("clearSelection")}
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[70rem] text-start text-sm">
          <thead className="bg-ivory-100 text-xs font-bold uppercase tracking-wide text-ink-500">
            <tr>
              {canManage && (
                <th scope="col" className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allChosen}
                    onChange={() => setSelected(allChosen ? [] : onScreen)}
                    aria-label={t("selectAll")}
                    className="size-4 accent-jade-600"
                  />
                </th>
              )}
              {head.map((h) => (
                <th key={h} scope="col" className="px-4 py-3 text-start">
                  {h}
                </th>
              ))}
              {canManage && (
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">{t("actions")}</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map((m) => {
              const all = m.grants.includes(GRANT_ALL_VIDEOS) && m.grants.includes(GRANT_ALL_LIVES);
              const isChosen = chosen.includes(m.code);
              return (
                <tr key={m.code} className={isChosen ? "bg-jade-50/60" : "hover:bg-ivory-50"}>
                  {canManage && (
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={isChosen}
                        onChange={() => toggle(m.code)}
                        aria-label={t("selectRow", { code: m.code })}
                        className="size-4 accent-jade-600"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/espace/membres/${m.code}`}
                      dir="ltr"
                      className="inline-block rounded-full bg-jade-50 px-3 py-1 font-bold tabular-nums text-jade-700 hover:bg-jade-100"
                    >
                      #{m.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    {m.fullName ? (
                      <>
                        <span dir="auto" className="block font-semibold">{m.fullName}</span>
                        {m.city && <span dir="auto" className="block text-xs text-ink-500">{m.city}</span>}
                      </>
                    ) : (
                      <span className="text-ink-400">{t("noName")}</span>
                    )}
                  </td>
                  <td dir="ltr" className="px-4 py-3.5 text-start font-medium">{m.email}</td>
                  <td dir="ltr" className="px-4 py-3.5 text-start tabular-nums">{m.phone}</td>
                  <td dir="ltr" className="px-4 py-3.5 text-start">{tt(m.title)}</td>
                  <td dir="ltr" className="px-4 py-3.5 text-start tabular-nums">{m.ultimateCode}</td>
                  <td className="px-4 py-3.5 text-ink-500">{formatDate(new Date(m.createdAt), locale)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {m.status === "suspended" && <Badge tone="alert">{t("suspended")}</Badge>}
                      {m.grants.length > 0 && (
                        <Badge tone="premium">
                          {all ? t("accessAll") : t("accessSome", { count: m.grants.length })}
                        </Badge>
                      )}
                    </div>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3.5 text-end">
                      <Button
                        size="sm"
                        variant="soft"
                        onClick={() => setModal({ kind: "one", code: m.code })}
                      >
                        <KeyRound className="size-4" aria-hidden /> {t("giveAccess")}
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canManage && (
        <Modal
          open={modal !== null}
          onClose={() => setModal(null)}
          title={
            modal?.kind === "bulk"
              ? t("bulkTitle", { count: modal.codes.length })
              : t("accessModalTitle", { code: openedMember?.code ?? 0 })
          }
        >
          {modal?.kind === "one" && openedMember && (
            <MemberAccessForm
              key={openedMember.code}
              code={openedMember.code}
              grants={openedMember.grants}
              premiumVideos={premiumVideos}
              readOnly={false}
            />
          )}
          {modal?.kind === "bulk" && (
            <BulkAccessForm codes={modal.codes} premiumVideos={premiumVideos} onSaved={clear} />
          )}
        </Modal>
      )}
    </>
  );
}
