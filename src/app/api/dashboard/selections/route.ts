import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signedImageUrl } from "@/lib/media-url";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const selections = await prisma.selection.findMany({
    where: { photo: { gallery: { userId: session.user.id } } },
    orderBy: { id: "desc" },
    include: {
      photo: {
        include: { gallery: true },
      },
    },
  });

  const mapped = await Promise.all(
    selections.map(async (s) => ({
      id: s.id,
      visitorId: s.visitorId,
      photo: {
        id: s.photo.id,
        filename: s.photo.filename,
        thumbUrl: await signedImageUrl(s.photo.thumbKey),
        galleryTitle: s.photo.gallery.title,
        gallerySlug: s.photo.gallery.slug,
      },
    })),
  );

  return NextResponse.json({ selections: mapped });
}
