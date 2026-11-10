"use client";

import { useActionState, useState, useTransition } from "react";
import { Pencil, Plus, Power, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { deleteNoteAction, saveNoteAction, toggleNoteAction } from "@/actions/assistant";
import { initialState, type FormState } from "@/actions/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Notice, TextArea, useErrorText } from "@/components/ui/form";
import { NOTE_BODY_MAX, NOTE_KEYWORDS_MAX, NOTE_TITLE_MAX } from "@/lib/assistant";
import { Modal } from "./Modal";

export interface NoteView {
  id: number;
  title: string;
  keywords: string;
  body: string;
  enabled: boolean;
  /** already formatted for the reader */
  updated: string;
}

/** The form to write a note, in a pop-up. Without `note` it creates one. */
function NoteModal({ open, onClose, note }: { open: boolean; onClose: () => void; note?: NoteView }) {
  const t = useTranslations("space.assistant");
  const c = useTranslations("common");
  const err = useErrorText();
  // a new key gives a blank form after a note was added
  const [round, setRound] = useState(0);
  const [state, action, pending] = useActionState(async (prev: FormState, fd: FormData) => {
    const result = await saveNoteAction(prev, fd);
    if (result.ok) {
      if (!note) setRound((r) => r + 1);
      onClose();
    }
    return result;
  }, initialState);
  const errors = state.errors ?? {};
  const values = state.values ?? {};

  return (
    <Modal open={open} onClose={onClose} title={note ? t("editNoteTitle") : t("addNoteTitle")}>
      <form key={`${round}:${JSON.stringify(values)}`} action={action} className="space-y-4">
        {note && <input type="hidden" name="id" value={note.id} />}
        {errors.form && <Notice tone="error">{err(errors.form)}</Notice>}
        <Field
          label={t("noteTitle")}
          name="title"
          hint={t("noteTitleHint")}
          defaultValue={values.title ?? note?.title}
          error={err(errors.title)}
          maxLength={NOTE_TITLE_MAX}
          dir="auto"
          required
        />
        <TextArea
          label={t("noteBody")}
          name="body"
          hint={t("noteBodyHint")}
          defaultValue={values.body ?? note?.body}
          error={err(errors.body)}
          maxLength={NOTE_BODY_MAX}
          rows={8}
          dir="auto"
          required
        />
        <TextArea
          label={t("noteKeywords")}
          name="keywords"
          hint={t("noteKeywordsHint")}
          defaultValue={values.keywords ?? note?.keywords}
          error={err(errors.keywords)}
          maxLength={NOTE_KEYWORDS_MAX}
          rows={2}
          dir="auto"
        />
        <label className="flex cursor-pointer items-center gap-3 rounded-xl p-3 ring-1 ring-ink-200 has-[:checked]:bg-jade-50 has-[:checked]:ring-jade-400">
          <input type="checkbox" name="enabled" defaultChecked={note?.enabled ?? true} className="size-4 accent-jade-600" />
          <span className="text-sm font-semibold">{t("noteEnabled")}</span>
        </label>
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {c("save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function AddNoteButton() {
  const t = useTranslations("space.assistant");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-[18px]" aria-hidden /> {t("addNote")}
      </Button>
      <NoteModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function NoteCard({ note }: { note: NoteView }) {
  const t = useTranslations("space.assistant");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <li className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-900/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 dir="auto" className="text-base font-bold">
              {note.title}
            </h3>
            {!note.enabled && <Badge tone="neutral">{t("off")}</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-ink-400">{t("updated", { date: note.updated })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Pencil className="size-3.5" aria-hidden /> {t("edit")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => startTransition(async () => void (await toggleNoteAction(note.id, !note.enabled)))}
          >
            <Power className="size-3.5" aria-hidden /> {note.enabled ? t("disable") : t("enable")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(t("deleteConfirm"))) return;
              startTransition(async () => void (await deleteNoteAction(note.id)));
            }}
          >
            <Trash2 className="size-3.5" aria-hidden /> {t("delete")}
          </Button>
        </div>
      </div>
      <p dir="auto" className="mt-3 line-clamp-4 whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink-700">
        {note.body}
      </p>
      {note.keywords && (
        <p dir="auto" className="mt-3 text-xs leading-snug text-ink-400">
          {note.keywords}
        </p>
      )}
      <NoteModal open={open} onClose={() => setOpen(false)} note={note} />
    </li>
  );
}
