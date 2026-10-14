"use client";

import { useActionState, useEffect } from "react";
import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { markConversationReadAction, staffReplyAction } from "@/actions/messages";
import { initialState } from "@/actions/types";
import { Button } from "@/components/ui/Button";
import { Notice, TextArea, useErrorText } from "@/components/ui/form";

/** Answer a member. The answer shows up on their contact button. */
export function ReplyForm({ code }: { code: number }) {
  const t = useTranslations("space.messages");
  const err = useErrorText();
  const [state, action, pending] = useActionState(staffReplyAction, initialState);

  return (
    // a new form after each sent reply (empty box); after an error it keeps what was typed
    <form
      key={state.ok ? `sent-${state.info?.id}` : JSON.stringify(state.values ?? {})}
      action={action}
      className="space-y-3"
    >
      <input type="hidden" name="code" value={code} />
      {state.errors?.form && <Notice tone="error">{err(state.errors.form)}</Notice>}
      <TextArea
        label={t("replyLabel")}
        name="body"
        placeholder={t("replyPlaceholder")}
        defaultValue={state.values?.body}
        error={err(state.errors?.body)}
        maxLength={2000}
        rows={4}
        required
      />
      <Button type="submit" disabled={pending}>
        <Send className="flip-rtl size-4" aria-hidden /> {t("reply")}
      </Button>
    </form>
  );
}

/** Opening a conversation means the team has read what the member wrote. */
export function MarkConversationRead({
  code,
  hasUnread,
}: {
  code: number;
  hasUnread: boolean;
}) {
  useEffect(() => {
    if (hasUnread) void markConversationReadAction(code);
  }, [code, hasUnread]);
  return null;
}
