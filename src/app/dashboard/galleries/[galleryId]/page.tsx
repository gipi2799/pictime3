"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type DragEvent, useCallback, useEffect, useState } from "react";

type Gallery = {
  id: string;
  title: string;
  slug: string;
  photoCount: number;
};

export default function GalleryManagePage() {
  const params = useParams<{ galleryId: string }>();
  const router = useRouter();
  const galleryId = params.galleryId;

  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/galleries");
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    const g = data.galleries.find((x: Gallery) => x.id === galleryId);
    setGallery(
      g
        ? { id: g.id, title: g.title, slug: g.slug, photoCount: g.photoCount }
        : null,
    );
    setLoading(false);
  }, [galleryId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.size > 0);
    if (!list.length) return;
    setUploading(true);
    setError(null);
    const form = new FormData();
    list.forEach((f) => form.append("files", f));
    const res = await fetch(`/api/galleries/${galleryId}/upload`, {
      method: "POST",
      body: form,
    });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Upload failed.");
      return;
    }
    await load();
    router.refresh();
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files?.length) {
      void uploadFiles(e.dataTransfer.files);
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  if (loading) {
    return <p className="text-ink-600">Loading…</p>;
  }

  if (!gallery) {
    return (
      <div className="space-y-4">
        <p className="text-ink-700">Gallery not found.</p>
        <Link href="/dashboard" className="text-sm text-ink-900 underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-xs font-medium text-ink-500 hover:text-ink-800">
            ← Dashboard
          </Link>
          <h1 className="mt-2 font-display text-4xl text-ink-950">{gallery.title}</h1>
          <p className="mt-1 text-sm text-ink-600">
            {gallery.photoCount} photo{gallery.photoCount === 1 ? "" : "s"} ·{" "}
            <Link href={`/gallery/${gallery.slug}`} className="underline-offset-2 hover:underline">
              {origin}/gallery/{gallery.slug}
            </Link>
          </p>
        </div>
        <Link
          href={`/gallery/${gallery.slug}`}
          className="rounded-full border border-ink-200 px-5 py-2 text-sm text-ink-800 transition hover:bg-ink-50"
        >
          Open client view
        </Link>
      </div>

      <section
        onDragEnter={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`rounded-2xl border-2 border-dashed px-6 py-14 text-center transition ${
          drag ? "border-ink-800 bg-ink-100" : "border-ink-300 bg-white"
        }`}
      >
        <p className="text-ink-800">Drag & drop images here</p>
        <p className="mt-2 text-sm text-ink-500">or choose files from your computer</p>
        <label className="mt-6 inline-block cursor-pointer rounded-full bg-ink-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-ink-800">
          {uploading ? "Uploading…" : "Browse files"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              if (e.target.files?.length) void uploadFiles(e.target.files);
            }}
          />
        </label>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </section>

      <section className="rounded-2xl border border-ink-200 bg-white p-6 text-sm text-ink-600 shadow-sm">
        <p>
          Photos you upload are stored under <code className="rounded bg-ink-100 px-1">/uploads</code> with
          generated thumbnails and previews. Open the client view to see the full masonry experience.
        </p>
      </section>
    </div>
  );
}
