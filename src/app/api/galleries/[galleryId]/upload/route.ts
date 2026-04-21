import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { processUploadedImage } from "@/lib/image-processing";
import { getSession } from "@/lib/session";

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(
  req: Request,
  { params }: { params: { galleryId: string } },
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gallery = await prisma.gallery.findFirst({
    where: { id: params.galleryId, userId: session.user.id },
  });
  if (!gallery) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  const form = await req.formData();
  const files = form.getAll("files") as File[];
  if (!files.length) {
    return NextResponse.json({ error: "No files" }, { status: 400 });
  }

  const created: { id: string; filename: string }[] = [];
  let sortBase = await prisma.photo.count({ where: { galleryId: gallery.id } });

  for (const file of files) {
    if (!file.size) continue;
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: `File too large: ${file.name}` }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const photoId = randomUUID();
    const processed = await processUploadedImage({
      galleryId: gallery.id,
      photoId,
      buffer,
      originalName: file.name || "upload.jpg",
    });

    const photo = await prisma.photo.create({
      data: {
        id: photoId,
        galleryId: gallery.id,
        filename: file.name || "photo.jpg",
        originalKey: processed.originalKey,
        thumbKey: processed.thumbKey,
        previewKey: processed.previewKey,
        width: processed.width,
        height: processed.height,
        sortOrder: sortBase,
      },
    });
    sortBase += 1;
    created.push({ id: photo.id, filename: photo.filename });
  }

  return NextResponse.json({ uploaded: created.length, photos: created });
}
