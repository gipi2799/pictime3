import path from "node:path";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { getObjectReadable } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: { photoId: string } },
) {
  const photo = await prisma.photo.findUnique({
    where: { id: params.photoId },
  });
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const variant = url.searchParams.get("variant") || "preview";
  const key =
    variant === "original"
      ? photo.originalKey
      : variant === "thumb"
        ? photo.thumbKey
        : photo.previewKey;

  try {
    const stream = await getObjectReadable(key);
    const filename =
      variant === "original"
        ? photo.filename
        : `${path.parse(photo.filename).name}-${variant}.jpg`;

    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
}
