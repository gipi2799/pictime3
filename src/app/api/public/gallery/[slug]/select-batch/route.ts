import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateVisitorId } from "@/lib/visitor";

const bodySchema = z.object({
  photoIds: z.array(z.string().min(1)).min(1).max(200),
});

/** Apply selection state for many photos (e.g. deep link ?selections=). */
export async function POST(
  req: Request,
  { params }: { params: { slug: string } },
) {
  const visitorId = getOrCreateVisitorId();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const gallery = await prisma.gallery.findUnique({
    where: { slug: params.slug },
  });
  if (!gallery) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  const photos = await prisma.photo.findMany({
    where: {
      galleryId: gallery.id,
      id: { in: parsed.data.photoIds },
      inAlbum: true,
    },
    select: { id: true },
  });

  for (const p of photos) {
    const existing = await prisma.selection.findFirst({
      where: { photoId: p.id, visitorId },
    });
    if (!existing) {
      await prisma.selection.create({
        data: { photoId: p.id, visitorId },
      });
    }
  }

  return NextResponse.json({ ok: true, applied: photos.map((p) => p.id) });
}
