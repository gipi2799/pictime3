import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signedImageUrl } from "@/lib/media-url";
import { getOrCreateVisitorId } from "@/lib/visitor";

const PAGE_SIZE = 24;

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const visitorId = getOrCreateVisitorId();

  const gallery = await prisma.gallery.findUnique({
    where: { slug: params.slug },
  });
  if (!gallery) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || "1") || 1);
  const filter = (url.searchParams.get("filter") || "all").toLowerCase();

  const baseWhere = {
    galleryId: gallery.id,
    inAlbum: true,
  };

  const filterWhere =
    filter === "favorites"
      ? { ...baseWhere, favorites: { some: { visitorId } } }
      : filter === "selected"
        ? { ...baseWhere, selections: { some: { visitorId } } }
        : baseWhere;

  const [totalImages, favoritesCount, selectedCount, total, photos] = await Promise.all([
    prisma.photo.count({ where: { galleryId: gallery.id, inAlbum: true } }),
    prisma.photo.count({
      where: { galleryId: gallery.id, inAlbum: true, favorites: { some: { visitorId } } },
    }),
    prisma.photo.count({
      where: { galleryId: gallery.id, inAlbum: true, selections: { some: { visitorId } } },
    }),
    prisma.photo.count({ where: filterWhere }),
    prisma.photo.findMany({
      where: filterWhere,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        favorites: { where: { visitorId }, select: { id: true } },
        selections: { where: { visitorId }, select: { id: true } },
      },
    }),
  ]);

  const skip = (page - 1) * PAGE_SIZE;
  const nextPage = skip + photos.length < total ? page + 1 : null;

  const mapped = await Promise.all(
    photos.map(async (p) => ({
      id: p.id,
      filename: p.filename,
      width: p.width,
      height: p.height,
      thumbUrl: await signedImageUrl(p.thumbKey),
      previewUrl: await signedImageUrl(p.previewKey),
      favored: p.favorites.length > 0,
      selected: p.selections.length > 0,
    })),
  );

  return NextResponse.json({
    gallery: {
      id: gallery.id,
      title: gallery.title,
      subtitle: gallery.subtitle,
      slug: gallery.slug,
      sectionEyebrow: gallery.sectionEyebrow,
      lockAfterSubmit: gallery.lockAfterSubmit,
      maxSelects: gallery.maxSelects,
      status: gallery.status,
    },
    stats: {
      totalImages,
      favoritesCount,
      selectedCount,
    },
    page,
    pageSize: PAGE_SIZE,
    total,
    nextPage,
    photos: mapped,
  });
}
