import { NextResponse } from "next/server";
import { getNotificationImage } from "@/server/notifications";

export const dynamic = "force-dynamic";

/**
 * The picture of a notification. Phones fetch it without signing in (it comes with a push message), so the
 * address carries a token that cannot be guessed instead; the picture never changes, so it is cached for good.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const image = await getNotificationImage(token);
  if (!image) return new NextResponse(null, { status: 404 });
  return new NextResponse(Buffer.from(image.base64, "base64"), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
