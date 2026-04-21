import { PassThrough, Readable } from "node:stream";
import archiver from "archiver";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getObjectReadable } from "@/lib/storage";
import { getOrCreateVisitorId } from "@/lib/visitor";

export const runtime = "nodejs";

const bodySchema = z.object({
  photoIds: z.array(z.string().min(1)).max(200).optional(),
  allSelected: z.boolean().optional(),
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

  let photoIds = parsed.data.photoIds ?? [];
  if (parsed.data.allSelected) {
    const rows = await prisma.selection.findMany({
      where: { visitorId, photo: { galleryId: gallery.id } },
      select: { photoId: true },
    });
    photoIds = rows.map((r) => r.photoId);
  }

  if (!photoIds.length) {
    return NextResponse.json({ error: "No photos selected" }, { status: 400 });
  }

  const photos = await prisma.photo.findMany({
    where: {
      galleryId: gallery.id,
      id: { in: photoIds },
      inAlbum: true,
    },
  });

  if (!photos.length) {
    return NextResponse.json({ error: "No matching photos" }, { status: 400 });
  }

  const pass = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 6 } });

  archive.on("error", (err: Error) => {
    pass.destroy(err);
  });

  archive.pipe(pass);

  const usedNames = new Map<string, number>();

  try {
    for (const photo of photos) {
      let name = photo.filename || `photo-${photo.id}.jpg`;
      const count = usedNames.get(name) ?? 0;
      usedNames.set(name, count + 1);
      if (count > 0) {
        const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : ".jpg";
        const base = name.includes(".") ? name.slice(0, name.lastIndexOf(".")) : name;
        name = `${base}-${count + 1}${ext}`;
      }

      const stream = await getObjectReadable(photo.originalKey);
      archive.append(stream, { name });
    }

    archive.finalize().catch(() => {
      /* surfaced via archive.on("error") */
    });
  } catch {
    return NextResponse.json({ error: "Could not build archive" }, { status: 500 });
  }

  const webStream = Readable.toWeb(pass) as ReadableStream;

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${gallery.slug}-selection.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
