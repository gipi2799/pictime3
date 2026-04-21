import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { uniqueSlug } from "@/lib/slug";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(120).optional(),
  subtitle: z.string().max(300).optional(),
  clientLabel: z.string().max(200).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const galleries = await prisma.gallery.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { photos: true, submissions: true } },
    },
  });

  const galleryIds = galleries.map((g) => g.id);
  const picksByGallery = new Map<string, number>();
  if (galleryIds.length) {
    const selections = await prisma.selection.findMany({
      where: { photo: { galleryId: { in: galleryIds } } },
      select: { photo: { select: { galleryId: true } } },
    });
    for (const s of selections) {
      const gid = s.photo.galleryId;
      picksByGallery.set(gid, (picksByGallery.get(gid) ?? 0) + 1);
    }
  }

  return NextResponse.json({
    galleries: galleries.map((g) => ({
      id: g.id,
      title: g.title,
      slug: g.slug,
      status: g.status,
      subtitle: g.subtitle,
      clientLabel: g.clientLabel,
      sectionEyebrow: g.sectionEyebrow,
      galleryPassword: g.galleryPassword,
      maxSelects: g.maxSelects,
      lockAfterSubmit: g.lockAfterSubmit,
      allowReopenAfterLock: g.allowReopenAfterLock,
      linkExpiresAt: g.linkExpiresAt,
      deadline: g.deadline,
      clientSiteBaseUrl: g.clientSiteBaseUrl,
      createdAt: g.createdAt,
      photoCount: g._count.photos,
      submissionCount: g._count.submissions,
      picksCount: picksByGallery.get(g.id) ?? 0,
    })),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const title = parsed.data.title.trim();
  const baseSlug = parsed.data.slug?.trim() || title;
  const slug = await uniqueSlug(baseSlug, async (s) => {
    const found = await prisma.gallery.findUnique({ where: { slug: s } });
    return !!found;
  });

  const gallery = await prisma.gallery.create({
    data: {
      title,
      slug,
      userId: session.user.id,
      subtitle: parsed.data.subtitle?.trim() || null,
      clientLabel: parsed.data.clientLabel?.trim() || null,
    },
  });

  return NextResponse.json({
    gallery: {
      id: gallery.id,
      title: gallery.title,
      slug: gallery.slug,
      status: gallery.status,
    },
  });
}
