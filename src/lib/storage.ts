import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import type { Readable } from "node:stream";

// Local file storage (MVP mode - no S3 required)
const STORAGE_DIR = path.join(process.cwd(), "public", "uploads");

async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {
    // Already exists or permission error
  }
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const fullPath = path.join(STORAGE_DIR, key);
  const dir = path.dirname(fullPath);
  await ensureDir(dir);
  await fs.writeFile(fullPath, body);
}

export async function presignedGetUrl(key: string, expiresIn = 3600): Promise<string> {
  // For local storage, just return a regular URL path
  // In production with S3, this would be a presigned URL
  return `/api/files/${encodeURIComponent(key)}`;
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const fullPath = path.join(STORAGE_DIR, key);
  return fs.readFile(fullPath);
}

/** Node Readable for archiver / streaming downloads */
export async function getObjectReadable(key: string): Promise<Readable> {
  const fullPath = path.join(STORAGE_DIR, key);
  // Verify file exists before streaming
  try {
    await fs.access(fullPath);
  } catch {
    throw new Error(`File not found: ${key}`);
  }
  return createReadStream(fullPath);
}
