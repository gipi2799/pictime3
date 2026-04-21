import { NextResponse } from "next/server";
import { z } from "zod";
import { GalleryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateVisitorId } from "@/lib/visitor";

const bodySchema = z.object({
  name: z.string().max(200).optional(),
  email: z.string().email().max(200).optional().or(z.literal("")),
  note: z.string().max(2000).optional(),
  photoIds: z.array(z.string()).min(0),
});

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

  if (gallery.lockAfterSubmit && gallery.status === GalleryStatus.SELECTIONS_IN) {
    if (!gallery.allowReopenAfterLock) {
      return NextResponse.json({ error: "Gallery is locked" }, { status: 403 });
    }
  }

  const photoIds = parsed.data.photoIds;
  const valid = await prisma.photo.findMany({
    where: { galleryId: gallery.id, id: { in: photoIds }, inAlbum: true },
    select: { id: true },
  });
  const validIds = valid.map((p) => p.id);

  await prisma.gallerySubmission.create({
    data: {
      galleryId: gallery.id,
      visitorId,
      name: parsed.data.name?.trim() || null,
      email: parsed.data.email?.trim() || null,
      note: parsed.data.note?.trim() || null,
      photoIds: JSON.stringify(validIds),
    },
  });

  let newStatus = gallery.status;
  if (gallery.status === GalleryStatus.CLIENT_REVIEWING) {
    newStatus = GalleryStatus.SELECTIONS_IN;
  }

  await prisma.gallery.update({
    where: { id: gallery.id },
    data: { status: newStatus },
  });

  return NextResponse.json({ ok: true, submittedIds: validIds, status: newStatus });
}
