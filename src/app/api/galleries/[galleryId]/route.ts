import { NextResponse } from "next/server";
import { z } from "zod";
import { GalleryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subtitle: z.string().max(300).nullable().optional(),
  clientLabel: z.string().max(200).nullable().optional(),
  sectionEyebrow: z.string().max(200).optional(),
  status: z.nativeEnum(GalleryStatus).optional(),
  galleryPassword: z.string().max(200).nullable().optional(),
  maxSelects: z.number().int().positive().nullable().optional(),
  lockAfterSubmit: z.boolean().optional(),
  allowReopenAfterLock: z.boolean().optional(),
  linkExpiresAt: z.union([z.string().datetime(), z.null()]).optional(),
  deadline: z.union([z.string().datetime(), z.null()]).optional(),
  clientSiteBaseUrl: z.union([z.string().url().max(500), z.literal(""), z.null()]).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: { galleryId: string } },
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gallery = await prisma.gallery.findFirst({
    where: { id: params.galleryId, userId: session.user.id },
    include: {
      _count: { select: { photos: true, submissions: true } },
    },
  });
  if (!gallery) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const picksCount = await prisma.selection.count({
    where: { photo: { galleryId: gallery.id } },
  });

  return NextResponse.json({
    gallery: {
      id: gallery.id,
      title: gallery.title,
      slug: gallery.slug,
      status: gallery.status,
      subtitle: gallery.subtitle,
      clientLabel: gallery.clientLabel,
      sectionEyebrow: gallery.sectionEyebrow,
      galleryPassword: gallery.galleryPassword,
      maxSelects: gallery.maxSelects,
      lockAfterSubmit: gallery.lockAfterSubmit,
      allowReopenAfterLock: gallery.allowReopenAfterLock,
      linkExpiresAt: gallery.linkExpiresAt,
      deadline: gallery.deadline,
      clientSiteBaseUrl: gallery.clientSiteBaseUrl,
      photoCount: gallery._count.photos,
      submissionCount: gallery._count.submissions,
      picksCount,
      createdAt: gallery.createdAt,
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { galleryId: string } },
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.gallery.findFirst({
    where: { id: params.galleryId, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const d = parsed.data;
  const data: Record<string, unknown> = {};

  if (d.title !== undefined) data.title = d.title.trim();
  if (d.subtitle !== undefined) data.subtitle = d.subtitle?.trim() ?? null;
  if (d.clientLabel !== undefined) data.clientLabel = d.clientLabel?.trim() ?? null;
  if (d.sectionEyebrow !== undefined) data.sectionEyebrow = d.sectionEyebrow.trim();
  if (d.status !== undefined) data.status = d.status;
  if (d.galleryPassword !== undefined) data.galleryPassword = d.galleryPassword?.trim() || null;
  if (d.maxSelects !== undefined) data.maxSelects = d.maxSelects;
  if (d.lockAfterSubmit !== undefined) data.lockAfterSubmit = d.lockAfterSubmit;
  if (d.allowReopenAfterLock !== undefined) data.allowReopenAfterLock = d.allowReopenAfterLock;
  if (d.linkExpiresAt !== undefined) {
    data.linkExpiresAt = d.linkExpiresAt ? new Date(d.linkExpiresAt) : null;
  }
  if (d.deadline !== undefined) {
    data.deadline = d.deadline ? new Date(d.deadline) : null;
  }
  if (d.clientSiteBaseUrl !== undefined) {
    data.clientSiteBaseUrl = d.clientSiteBaseUrl && d.clientSiteBaseUrl.length > 0 ? d.clientSiteBaseUrl : null;
  }

  const gallery = await prisma.gallery.update({
    where: { id: existing.id },
    data: data as object,
  });

  return NextResponse.json({
    gallery: {
      id: gallery.id,
      title: gallery.title,
      slug: gallery.slug,
      status: gallery.status,
      subtitle: gallery.subtitle,
      clientLabel: gallery.clientLabel,
    },
  });
}
