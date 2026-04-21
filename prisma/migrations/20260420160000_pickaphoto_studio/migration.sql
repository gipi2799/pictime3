-- CreateEnum
CREATE TYPE "GalleryStatus" AS ENUM ('DRAFT', 'CLIENT_REVIEWING', 'SELECTIONS_IN', 'DELIVERED', 'ARCHIVED');

-- AlterTable Gallery
ALTER TABLE "Gallery" ADD COLUMN "status" "GalleryStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Gallery" ADD COLUMN "subtitle" TEXT;
ALTER TABLE "Gallery" ADD COLUMN "clientLabel" TEXT;
ALTER TABLE "Gallery" ADD COLUMN "sectionEyebrow" TEXT NOT NULL DEFAULT 'Unforgettable moments';
ALTER TABLE "Gallery" ADD COLUMN "galleryPassword" TEXT;
ALTER TABLE "Gallery" ADD COLUMN "maxSelects" INTEGER;
ALTER TABLE "Gallery" ADD COLUMN "lockAfterSubmit" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Gallery" ADD COLUMN "allowReopenAfterLock" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Gallery" ADD COLUMN "linkExpiresAt" TIMESTAMP(3);
ALTER TABLE "Gallery" ADD COLUMN "deadline" TIMESTAMP(3);
ALTER TABLE "Gallery" ADD COLUMN "clientSiteBaseUrl" TEXT;

-- AlterTable Photo
ALTER TABLE "Photo" ADD COLUMN "inAlbum" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable GallerySubmission
CREATE TABLE "GallerySubmission" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "note" TEXT,
    "photoIds" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GallerySubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GallerySubmission_galleryId_idx" ON "GallerySubmission"("galleryId");

ALTER TABLE "GallerySubmission" ADD CONSTRAINT "GallerySubmission_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Gallery_status_idx" ON "Gallery"("status");
