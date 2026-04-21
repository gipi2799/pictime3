import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signedImageUrl } from "@/lib/media-url";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const favorites = await prisma.favorite.findMany({
    where: { photo: { gallery: { userId: session.user.id } } },
    orderBy: { id: "desc" },
    include: {
      photo: {
        include: { gallery: true },
      },
    },
  });

  const mapped = await Promise.all(
    favorites.map(async (f) => ({
      id: f.id,
      visitorId: f.visitorId,
      photo: {
        id: f.photo.id,
        filename: f.photo.filename,
        thumbUrl: await signedImageUrl(f.photo.thumbKey),
        galleryTitle: f.photo.gallery.title,
        gallerySlug: f.photo.gallery.slug,
      },
    })),
  );

  return NextResponse.json({ favorites: mapped });
}
