"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Photo = {
  id: string;
  filename: string;
  width: number;
  height: number;
  thumbUrl: string;
  previewUrl: string;
  favored: boolean;
  selected: boolean;
};

type GalleryInfo = {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  sectionEyebrow: string;
  lockAfterSubmit: boolean;
  maxSelects: number | null;
  status: string;
};

type Stats = {
  totalImages: number;
  favoritesCount: number;
  selectedCount: number;
};

type FilterTab = "all" | "favorites" | "selected";

const PROFILE_KEY = (slug: string) => `pickaphoto_profile_${slug}`;

export function GalleryClient({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const [gallery, setGallery] = useState<GalleryInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [page, setPage] = useState(1);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");

  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const [submitStep, setSubmitStep] = useState<"idle" | "confirm" | "done">("idle");
  const [submitNote, setSubmitNote] = useState("");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [slideshow, setSlideshow] = useState(false);
  const touchStart = useRef<number | null>(null);

  const loadPage = useCallback(
    async (p: number, append: boolean, f: FilterTab) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      const q = f === "all" ? "all" : f;
      const res = await fetch(
        `/api/public/gallery/${encodeURIComponent(slug)}/photos?page=${p}&filter=${q}`,
      );
      if (!res.ok) {
        setError(res.status === 404 ? "Gallery not found." : "Could not load gallery.");
        setLoading(false);
        setLoadingMore(false);
        return;
      }
      const data = await res.json();
      setGallery(data.gallery);
      setStats(data.stats);
      setPhotos((prev) => (append ? [...prev, ...data.photos] : data.photos));
      setNextPage(data.nextPage);
      setPage(data.page);
      setLoading(false);
      setLoadingMore(false);
    },
    [slug],
  );

  useEffect(() => {
    void loadPage(1, false, filter);
  }, [slug, filter, loadPage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(PROFILE_KEY(slug));
    if (saved) {
      try {
        const p = JSON.parse(saved) as { name?: string; email?: string };
        if (p.name) setProfileName(p.name);
        if (p.email) setProfileEmail(p.email);
        setWelcomeOpen(false);
      } catch {
        /* ignore */
      }
    }
  }, [slug]);

  const selectionsApplied = useRef(false);
  useEffect(() => {
    const raw = searchParams.get("selections");
    if (!raw || selectionsApplied.current) return;
    try {
      const decoded = JSON.parse(atob(decodeURIComponent(raw))) as unknown;
      if (!Array.isArray(decoded)) return;
      const ids = decoded.filter((x): x is string => typeof x === "string");
      if (!ids.length) return;
      selectionsApplied.current = true;
      void fetch(`/api/public/gallery/${encodeURIComponent(slug)}/select-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds: ids }),
      }).then(() => {
        void loadPage(1, false, "all");
      });
    } catch {
      /* ignore */
    }
  }, [searchParams, slug, loadPage]);

  useEffect(() => {
    if (lightbox === null || !slideshow) return;
    const id = window.setInterval(() => {
      setLightbox((i) => {
        if (i === null) return i;
        return photos.length ? (i + 1) % photos.length : i;
      });
    }, 5000);
    return () => window.clearInterval(id);
  }, [lightbox, slideshow, photos.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (lightbox === null) return;
      if (e.key === "Escape") {
        setLightbox(null);
        setSlideshow(false);
      }
      if (e.key === "ArrowRight") {
        setLightbox((i) => (i === null ? i : (i + 1) % photos.length));
      }
      if (e.key === "ArrowLeft") {
        setLightbox((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, photos.length]);

  useEffect(() => {
    if (lightbox === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [lightbox]);

  async function toggleFavorite(photoId: string) {
    const prevFav = photos.find((p) => p.id === photoId)?.favored ?? false;
    const res = await fetch(`/api/public/photos/${photoId}/favorite`, { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, favored: data.favored } : p)),
    );
    setStats((s) => {
      if (!s) return s;
      let d = 0;
      if (data.favored && !prevFav) d = 1;
      if (!data.favored && prevFav) d = -1;
      return { ...s, favoritesCount: Math.max(0, s.favoritesCount + d) };
    });
  }

  async function toggleSelect(photoId: string) {
    const prevSel = photos.find((p) => p.id === photoId)?.selected ?? false;
    const res = await fetch(`/api/public/photos/${photoId}/select`, { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, selected: data.selected } : p)),
    );
    setStats((s) => {
      if (!s) return s;
      let d = 0;
      if (data.selected && !prevSel) d = 1;
      if (!data.selected && prevSel) d = -1;
      return { ...s, selectedCount: Math.max(0, s.selectedCount + d) };
    });
  }

  const selectedCount = useMemo(() => photos.filter((p) => p.selected).length, [photos]);

  async function downloadZip() {
    const res = await fetch(`/api/public/gallery/${encodeURIComponent(slug)}/zip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allSelected: true }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-selection.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function submitSelection() {
    const ids = photos.filter((p) => p.selected).map((p) => p.id);
    const res = await fetch(`/api/public/gallery/${encodeURIComponent(slug)}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: profileName || undefined,
        email: profileEmail || undefined,
        note: submitNote || undefined,
        photoIds: ids,
      }),
    });
    if (!res.ok) return;
    setSubmitStep("done");
  }

  function persistProfile() {
    localStorage.setItem(PROFILE_KEY(slug), JSON.stringify({ name: profileName, email: profileEmail }));
    setWelcomeOpen(false);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = e.changedTouches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (lightbox === null || touchStart.current === null) return;
    const end = e.changedTouches[0].clientX;
    const delta = end - touchStart.current;
    touchStart.current = null;
    if (Math.abs(delta) < 50) return;
    if (delta < 0) {
      setLightbox((i) => (i === null ? i : (i + 1) % photos.length));
    } else {
      setLightbox((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    }
  }

  const displayPhotos = photos;
  const current = lightbox !== null ? photos[lightbox] : null;

  if (loading && !gallery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf9f7] text-stone-500">
        Loading gallery…
      </div>
    );
  }

  if (error || !gallery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf9f7] px-6 text-center text-stone-700">
        {error}
      </div>
    );
  }

  const selTotal = stats?.selectedCount ?? selectedCount;
  const favTotal = stats?.favoritesCount ?? 0;

  return (
    <div className="min-h-screen bg-[#faf9f7] pb-28 text-stone-900">
      <header className="border-b border-stone-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div>
            <p className="font-display text-xl text-stone-900">Pickaphoto</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-stone-500">Private gallery</p>
          </div>
          <div className="flex items-center gap-6 text-[10px] font-semibold uppercase tracking-[0.25em] text-stone-600">
            <Link href="/" className="hover:text-stone-900">
              Home
            </Link>
            <button type="button" onClick={() => setGuideOpen(true)} className="hover:text-stone-900">
              Guide
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pt-10">
        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.4em] text-stone-500">
          {gallery.sectionEyebrow || "Unforgettable moments"}
        </p>
        <h1 className="mt-3 text-center font-display text-3xl text-stone-900 md:text-4xl">{gallery.title}</h1>
        {gallery.subtitle && <p className="mt-2 text-center text-sm text-stone-600">{gallery.subtitle}</p>}
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-stone-600">
          Open each image full screen, save your favorites, and mark the shots you want delivered. Submit when the set
          feels complete.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
          <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
            <span className="mr-2 text-stone-400">View</span>
            {(
              [
                ["all", "All"],
                ["favorites", "Favorites"],
                ["selected", "Selected"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setFilter(key);
                  setPhotos([]);
                  setPage(1);
                }}
                className={`rounded-full px-3 py-1 ${
                  filter === key ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[11px] font-medium tracking-wide text-stone-600">
            {stats?.totalImages ?? 0} images · {stats?.favoritesCount ?? 0} favorites · {stats?.selectedCount ?? 0}{" "}
            selected
          </p>
        </div>

        {displayPhotos.length === 0 && !loading ? (
          <p className="py-20 text-center text-sm text-stone-500">
            Nothing to show here. Try another filter or add favorites and selections.
          </p>
        ) : (
          <div className="masonry columns-1 gap-4 pt-8 sm:columns-2 lg:columns-3">
            {displayPhotos.map((p, idx) => (
              <div key={p.id} className="masonry-item mb-4 break-inside-avoid">
                <div className="group relative overflow-hidden rounded-lg bg-stone-200 shadow-sm">
                  <button type="button" className="relative block w-full" onClick={() => setLightbox(idx)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.thumbUrl}
                      alt=""
                      loading="lazy"
                      className="w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                    />
                  </button>
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    <button
                      type="button"
                      aria-label="Favorite"
                      onClick={() => void toggleFavorite(p.id)}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-black/30 text-white backdrop-blur transition hover:bg-black/50 ${
                        p.favored ? "text-red-400" : ""
                      }`}
                    >
                      ♥
                    </button>
                    <button
                      type="button"
                      aria-label="Select"
                      onClick={() => void toggleSelect(p.id)}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-black/30 text-white backdrop-blur hover:bg-black/50 ${
                        p.selected ? "bg-white text-stone-900" : ""
                      }`}
                    >
                      ✓
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {nextPage && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void loadPage(nextPage, true, filter)}
              className="rounded-full border border-stone-300 px-6 py-2 text-sm text-stone-700 hover:bg-white"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </main>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-stone-700 bg-stone-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-stone-400">Your selection</p>
            <p className="text-sm font-medium">
              {selTotal} photos · {favTotal} ♥
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={selTotal === 0}
              onClick={() => void downloadZip()}
              className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-stone-900 disabled:opacity-40"
            >
              Download
            </button>
            <button
              type="button"
              disabled={selTotal === 0}
              onClick={() => setSubmitStep("confirm")}
              className="rounded-full bg-stone-600 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-40"
            >
              Submit
            </button>
          </div>
        </div>
      </div>

      {/* Welcome */}
      <AnimatePresence>
        {welcomeOpen && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl"
              initial={{ y: 12 }}
              animate={{ y: 0 }}
            >
              <h2 className="font-display text-2xl text-stone-900">Welcome to your gallery</h2>
              <p className="mt-2 text-sm text-stone-600">
                Your name helps your photographer match your selections.
              </p>
              <label className="mt-6 block text-xs font-medium uppercase tracking-wider text-stone-500">
                Your name
                <input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g. Alex Nguyen"
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm text-stone-900"
                />
              </label>
              <label className="mt-4 block text-xs font-medium uppercase tracking-wider text-stone-500">
                Email (optional)
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm text-stone-900"
                />
              </label>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setWelcomeOpen(false)}
                  className="rounded-full border border-stone-300 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => persistProfile()}
                  className="rounded-full bg-stone-800 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guide */}
      <AnimatePresence>
        {guideOpen && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setGuideOpen(false)}
          >
            <motion.div
              className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl"
              initial={{ scale: 0.98 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display text-xl text-stone-900">How it works</h2>
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-stone-600">
                <li>Browse — Tap any photo for a full-screen view. Use arrows or keyboard.</li>
                <li>Heart and select the images you love for your album.</li>
                <li>Filter by All / Favorites / Selected to focus your review.</li>
                <li>Download a ZIP or submit your picks to your photographer.</li>
              </ol>
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="mt-6 rounded-full bg-stone-900 px-6 py-2 text-xs font-semibold uppercase tracking-wider text-white"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <AnimatePresence>
        {submitStep === "confirm" && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
              <h2 className="font-display text-xl text-stone-900">Submit your selection</h2>
              <p className="mt-2 text-sm text-stone-600">
                You&apos;re about to send {selTotal} photo(s) to your photographer.
              </p>
              <label className="mt-4 block text-xs text-stone-500">
                Note (optional)
                <textarea
                  value={submitNote}
                  onChange={(e) => setSubmitNote(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                />
              </label>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSubmitStep("idle")}
                  className="rounded-full border border-stone-300 px-5 py-2 text-xs font-semibold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void submitSelection()}
                  className="rounded-full bg-stone-900 px-5 py-2 text-xs font-semibold uppercase text-white"
                >
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        )}
        {submitStep === "done" && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
              <h2 className="font-display text-2xl text-stone-900">Merci — selection sent</h2>
              <p className="mt-3 text-sm text-stone-600">
                Your picks are saved. You can share this page with your photographer or use the link they sent you.
              </p>
              <button
                type="button"
                onClick={() => setSubmitStep("idle")}
                className="mt-6 rounded-full bg-stone-900 px-6 py-2 text-xs font-semibold uppercase text-white"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox !== null && current && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between px-4 py-3 text-xs">
              <span>
                {lightbox + 1} / {photos.length}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSlideshow((s) => !s)}
                  className={`rounded-full px-3 py-1 ${slideshow ? "bg-white text-black" : "bg-white/10"}`}
                >
                  Slideshow {slideshow ? "on" : "off"}
                </button>
                <a
                  href={`/api/public/photos/${current.id}/download?variant=original`}
                  className="rounded-full bg-white/10 px-3 py-1"
                >
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setLightbox(null);
                    setSlideshow(false);
                  }}
                  className="rounded-full bg-white/10 px-3 py-1"
                >
                  Close
                </button>
              </div>
            </div>
            <div
              className="relative flex flex-1 items-center justify-center px-2"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              <button
                type="button"
                className="absolute left-2 z-10 hidden rounded-full bg-white/10 px-3 py-2 sm:block"
                onClick={() =>
                  setLightbox((i) => (i === null ? i : (i - 1 + photos.length) % photos.length))
                }
              >
                ‹
              </button>
              <motion.div
                key={current.id}
                initial={{ opacity: 0.3 }}
                animate={{ opacity: 1 }}
                className="relative max-h-[80vh] max-w-6xl"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={current.previewUrl} alt="" className="max-h-[80vh] w-auto object-contain" />
              </motion.div>
              <button
                type="button"
                className="absolute right-2 z-10 hidden rounded-full bg-white/10 px-3 py-2 sm:block"
                onClick={() => setLightbox((i) => (i === null ? i : (i + 1) % photos.length))}
              >
                ›
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
