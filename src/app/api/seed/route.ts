import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { processBufferToGallery } from "@/lib/image-processing";

const prisma = new PrismaClient();

const DEMO_EMAIL = "admin@test.com";
const DEMO_PASSWORD = "123456";

const GALLERIES = [
  {
    title: "Paris wedding — preview",
    slug: "paris-proposal",
    subtitle: "Sample — Paris wedding",
    clientLabel: "Demo couple",
  },
  {
    title: "Wedding Demo",
    slug: "wedding-demo",
    subtitle: "Sample — editorial",
    clientLabel: "Demo couple",
  },
] as const;

const PHOTOS_PER_GALLERY = 20;

async function fetchPlaceholder(seed: string): Promise<Buffer> {
  const url = `https://picsum.photos/seed/${encodeURIComponent(seed)}/1400/933`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Failed to fetch placeholder ${seed}: ${res.status}`);
  }
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

async function ensureGalleryPhotos(galleryId: string, slug: string) {
  const count = await prisma.photo.count({ where: { galleryId } });
  if (count >= PHOTOS_PER_GALLERY) return;

  for (let i = count; i < PHOTOS_PER_GALLERY; i += 1) {
    const seed = `${slug}-${i + 1}`;
    const buffer = await fetchPlaceholder(seed);
    const photoId = randomUUID();
    const processed = await processBufferToGallery({
      galleryId,
      photoId,
      buffer,
      ext: ".jpg",
    });

    await prisma.photo.create({
      data: {
        id: photoId,
        galleryId,
        filename: `photo-${i + 1}.jpg`,
        originalKey: processed.originalKey,
        thumbKey: processed.thumbKey,
        previewKey: processed.previewKey,
        width: processed.width,
        height: processed.height,
        sortOrder: i,
      },
    });
  }
}

export async function POST() {
  try {
    // Check if admin user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: DEMO_EMAIL },
    });

    if (existingUser) {
      return NextResponse.json({
        message: "Demo data already seeded",
        user: { email: DEMO_EMAIL, password: DEMO_PASSWORD }
      });
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
    const user = await prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        passwordHash: hashedPassword,
        name: "Demo Admin",
      },
    });

    // Create galleries
    const galleries = [];
    for (const galleryData of GALLERIES) {
      const gallery = await prisma.gallery.create({
        data: {
          title: galleryData.title,
          slug: galleryData.slug,
          subtitle: galleryData.subtitle,
          clientLabel: galleryData.clientLabel,
          userId: user.id,
        },
      });
      galleries.push(gallery);

      // Add photos to gallery
      await ensureGalleryPhotos(gallery.id, gallery.slug);
    }

    return NextResponse.json({
      message: "Demo data seeded successfully",
      user: {
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      },
      galleries: galleries.map(g => ({
        title: g.title,
        slug: g.slug,
        url: `/gallery/${g.slug}`,
      })),
    });

  } catch (error) {
    console.error("Seeding error:", error);
    return NextResponse.json(
      { error: "Failed to seed demo data" },
      { status: 500 }
    );
  }
}
