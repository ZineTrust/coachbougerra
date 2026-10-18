"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { deleteVideoAction } from "@/actions/videos";
import { Button } from "@/components/ui/Button";
import { useRouter } from "@/i18n/navigation";

/** Delete a formation (after asking). Back to the list afterwards. */
export function DeleteVideoButton({ slug }: { slug: string }) {
  const t = useTranslations("space.videos");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="danger"
      className="w-full"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(t("deleteConfirm"))) return;
        startTransition(async () => {
          const result = await deleteVideoAction(slug);
          if (result.ok) router.push("/espace/videos");
          else router.refresh();
        });
      }}
    >
      <Trash2 className="size-4" aria-hidden /> {t("delete")}
    </Button>
  );
}
