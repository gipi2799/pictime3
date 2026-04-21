import { presignedGetUrl } from "./storage";

/** Presigned HTTPS URL for a stored object key (thumbnails / previews in the gallery UI). */
export async function signedImageUrl(key: string): Promise<string> {
  return presignedGetUrl(key, 3600);
}
