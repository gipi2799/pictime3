import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateVisitorId } from "@/lib/visitor";

export async function POST(
  _req: Request,
  { params }: { params: { photoId: string } },
) {
  const visitorId = getOrCreateVisitorId();

  const photo = await prisma.photo.findUnique({
    where: { id: params.photoId },
  });
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await prisma.selection.findFirst({
    where: { photoId: photo.id, visitorId },
  });

  if (existing) {
    await prisma.selection.delete({ where: { id: existing.id } });
    return NextResponse.json({ selected: false });
  }

  await prisma.selection.create({
    data: { photoId: photo.id, visitorId },
  });
  return NextResponse.json({ selected: true });
}
