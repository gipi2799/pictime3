import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { processBufferToGallery } from "../src/lib/image-processing";

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
        filename: `${slug}-${i + 1}.jpg`,
        originalKey: processed.originalKey,
        thumbKey: processed.thumbKey,
        previewKey: processed.previewKey,
        width: processed.width,
        height: processed.height,
        sortOrder: i,
        inAlbum: true,
      },
    });
  }
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash },
    create: {
      email: DEMO_EMAIL,
      passwordHash,
      name: "Demo Photographer",
    },
  });

  for (const g of GALLERIES) {
    const gallery = await prisma.gallery.upsert({
      where: { slug: g.slug },
      update: {
        title: g.title,
        subtitle: g.subtitle,
        clientLabel: g.clientLabel,
        userId: user.id,
      },
      create: {
        title: g.title,
        slug: g.slug,
        subtitle: g.subtitle,
        clientLabel: g.clientLabel,
        userId: user.id,
      },
    });
    await ensureGalleryPhotos(gallery.id, g.slug);
  }

  console.log("Seed complete:", DEMO_EMAIL, GALLERIES.map((x) => x.slug).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
