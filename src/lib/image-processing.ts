import path from "node:path";
import sharp from "sharp";
import { putObject } from "./storage";

const THUMB_MAX = 420;
const PREVIEW_MAX = 1600;

export type ProcessedKeys = {
  originalKey: string;
  thumbKey: string;
  previewKey: string;
  width: number;
  height: number;
};

function keyParts(galleryId: string, photoId: string, name: string): string {
  return `galleries/${galleryId}/${photoId}/${name}`.replace(/\\/g, "/");
}

export async function processUploadedImage(params: {
  galleryId: string;
  photoId: string;
  buffer: Buffer;
  originalName: string;
}): Promise<ProcessedKeys> {
  const ext = path.extname(params.originalName) || ".jpg";
  const base = params.photoId;

  const originalKey = keyParts(params.galleryId, base, `original${ext}`);
  const thumbKey = keyParts(params.galleryId, base, "thumb.jpg");
  const previewKey = keyParts(params.galleryId, base, "preview.jpg");

  const meta = await sharp(params.buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  const mime =
    ext.toLowerCase() === ".png"
      ? "image/png"
      : ext.toLowerCase() === ".webp"
        ? "image/webp"
        : "image/jpeg";

  await putObject(originalKey, params.buffer, mime);

  const thumbBuf = await sharp(params.buffer)
    .rotate()
    .resize({
      width: THUMB_MAX,
      height: THUMB_MAX,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  const previewBuf = await sharp(params.buffer)
    .rotate()
    .resize({
      width: PREVIEW_MAX,
      height: PREVIEW_MAX,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  await putObject(thumbKey, thumbBuf, "image/jpeg");
  await putObject(previewKey, previewBuf, "image/jpeg");

  return {
    originalKey,
    thumbKey,
    previewKey,
    width,
    height,
  };
}

export async function processBufferToGallery(params: {
  galleryId: string;
  photoId: string;
  buffer: Buffer;
  ext?: string;
}): Promise<ProcessedKeys> {
  const ext = params.ext ?? ".jpg";
  return processUploadedImage({
    galleryId: params.galleryId,
    photoId: params.photoId,
    buffer: params.buffer,
    originalName: `source${ext}`,
  });
}
