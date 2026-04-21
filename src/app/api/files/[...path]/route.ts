import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  try {
    // Reconstruct the file key from URL path
    const fileKey = params.path.map(decodeURIComponent).join("/");

    // Security: prevent directory traversal
    if (fileKey.includes("..") || fileKey.startsWith("/")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const fullPath = path.join(process.cwd(), "public", "uploads", fileKey);

    try {
      const content = await fs.readFile(fullPath);

      // Determine MIME type from file extension
      const ext = path.extname(fileKey).toLowerCase();
      const mimeTypes: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".zip": "application/zip",
      };
      const contentType = mimeTypes[ext] || "application/octet-stream";

      return new NextResponse(content, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch (e) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  } catch (e) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
