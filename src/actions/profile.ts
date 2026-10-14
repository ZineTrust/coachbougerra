"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { currentMember } from "@/server/current";
import { removeAvatar, setAvatar } from "@/server/engagement";
import { updateProfile } from "@/server/members";
import type { FormState } from "./types";

const clean = (value: FormDataEntryValue | null) => String(value ?? "").trim().replace(/\s+/g, " ");

/** Name, city and the ranking choice. All optional. */
export async function updateProfileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const member = await currentMember();
  if (!member) return { errors: { form: "forbidden" } };

  const fullName = clean(fd.get("fullName"));
  const city = clean(fd.get("city"));
  const showInRanking = fd.get("showInRanking") === "on";
  const values = { fullName, city };

  const errors: Record<string, string> = {};
  if (fullName && (fullName.length < 2 || fullName.length > 80)) errors.fullName = "invalid_name";
  if (city.length > 60) errors.city = "too_long";
  if (Object.keys(errors).length > 0) return { errors, values };

  await updateProfile(member.code, {
    fullName: fullName || null,
    city: city || null,
    showInRanking,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * The photo is shrunk in the browser first, then checked and re-encoded here:
 * whatever was sent is decoded as a real image and saved as a small square JPEG
 * (which also strips any hidden data such as GPS position).
 */
export async function uploadAvatarAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const member = await currentMember();
  if (!member) return { errors: { form: "forbidden" } };

  const file = fd.get("photo");
  if (!(file instanceof File) || file.size === 0) return { errors: { photo: "required" } };
  if (file.size > 2 * 1024 * 1024) return { errors: { photo: "image_too_big" } };

  try {
    const jpeg = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize(256, 256, { fit: "cover", position: "attention" })
      .jpeg({ quality: 82 })
      .toBuffer();
    await setAvatar(member.code, jpeg.toString("base64"));
  } catch {
    return { errors: { photo: "invalid_image" } };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeAvatarAction(): Promise<void> {
  const member = await currentMember();
  if (!member) return;
  await removeAvatar(member.code);
  revalidatePath("/", "layout");
}
