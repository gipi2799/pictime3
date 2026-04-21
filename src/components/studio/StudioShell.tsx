"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { PipelineBoard, type PipelineGallery } from "./PipelineBoard";
import { SignOutButton } from "@/components/sign-out-button";

type Tab = "overview" | "jobs" | "client" | "settings";

export function StudioShell({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [galleries, setGalleries] = useState<PipelineGallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const [clientGalleryId, setClientGalleryId] = useState<string>("");
  const [albumTitle, setAlbumTitle] = useState("");
  const [albumSubtitle, setAlbumSubtitle] = useState("");
  const [clientLabel, setClientLabel] = useState("");
  const [clientBaseUrl, setClientBaseUrl] = useState("");
  const [galleryPassword, setGalleryPassword] = useState("");
  const [maxSelects, setMaxSelects] = useState("");
  const [lockAfterSubmit, setLockAfterSubmit] = useState(false);
  const [allowReopen, setAllowReopen] = useState(true);
  const [savingClient, setSavingClient] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/galleries");
    if (!res.ok) return;
    const data = await res.json();
    setGalleries(data.galleries);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (clientGalleryId || galleries.length === 0) return;
    setClientGalleryId(galleries[0].id);
  }, [galleries, clientGalleryId]);

  useEffect(() => {
    const g = galleries.find((x) => x.id === clientGalleryId);
    if (g) {
      setAlbumTitle(g.title);
      setAlbumSubtitle(g.subtitle || "");
      setClientLabel(g.clientLabel || "");
      setClientBaseUrl(g.clientSiteBaseUrl || "");
      setGalleryPassword(g.galleryPassword || "");
      setMaxSelects(g.maxSelects != null ? String(g.maxSelects) : "");
      setLockAfterSubmit(g.lockAfterSubmit);
      setAllowReopen(g.allowReopenAfterLock);
    }
  }, [clientGalleryId, galleries]);

  useEffect(() => {
    const done = typeof window !== "undefined" && localStorage.getItem("pickaphoto_tour_done");
    if (!done) setTourOpen(true);
  }, []);

  async function patchGallery(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/galleries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) await load();
  }

  async function onStatusChange(galleryId: string, status: string) {
    await patchGallery(galleryId, { status });
  }

  async function onCreateJob(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    const res = await fetch("/api/galleries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    setCreating(false);
    if (res.ok) {
      setNewTitle("");
      await load();
    }
  }

  async function saveClientSection(e: FormEvent) {
    e.preventDefault();
    if (!clientGalleryId) return;
    setSavingClient(true);
    await patchGallery(clientGalleryId, {
      title: albumTitle.trim(),
      subtitle: albumSubtitle.trim() || null,
      clientLabel: clientLabel.trim() || null,
      clientSiteBaseUrl: clientBaseUrl.trim() || null,
      galleryPassword: galleryPassword.trim() || null,
      maxSelects: maxSelects ? parseInt(maxSelects, 10) : null,
      lockAfterSubmit,
      allowReopenAfterLock: allowReopen,
    });
    setSavingClient(false);
  }

  async function publishToClient() {
    if (!clientGalleryId) return;
    await patchGallery(clientGalleryId, { status: "CLIENT_REVIEWING" });
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const selected = galleries.find((g) => g.id === clientGalleryId);
  const shareUrl = selected
    ? `${clientBaseUrl?.trim() || origin}/gallery/${selected.slug}`
    : "";

  const tourSlides = [
    {
      title: "Welcome to Pickaphoto Studio",
      body: "Take a short tour of each area. You can skip anytime or tap Tour in the header again later.",
    },
    {
      title: "Pipeline",
      body: "Columns follow each job’s real status: publish moves a job to Client reviewing; when the client submits picks, it moves to Selections in. Drag cards anytime to override.",
    },
    {
      title: "Jobs",
      body: "Couples, dates, package — CRM-lite. Create jobs and track them alongside the pipeline.",
    },
    {
      title: "Client link",
      body: "Name the album, upload proofs, tune access, then publish — only photos marked for the album go to the client gallery.",
    },
    {
      title: "Settings",
      body: "Storage estimate and future integrations.",
    },
  ];

  return (
    <div className="min-h-screen text-stone-900">
      <header className="border-b border-stone-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xl tracking-tight text-stone-900">Pickaphoto</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-stone-500">Studio</span>
          </div>
          <nav className="flex flex-wrap items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-600">
            {(
              [
                ["overview", "Overview"],
                ["jobs", "Jobs"],
                ["client", "Client link"],
                ["settings", "Settings"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-full px-3 py-1.5 transition ${
                  tab === id ? "bg-stone-900 text-white" : "hover:bg-stone-100"
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setTourOpen(true);
                setTourStep(0);
              }}
              className="ml-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700 underline-offset-4 hover:underline"
            >
              Tour
            </button>
          </nav>
          <div className="flex items-center gap-3 text-xs text-stone-600">
            <span className="hidden sm:inline">{email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-6">
        <div className="mb-6 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          <strong className="font-medium">Browser demo</strong> — This studio uses your deployed API, PostgreSQL, and
          object storage. Configure environment variables on Railway (see <code className="rounded bg-white/60 px-1">DEPLOY_RAILWAY.md</code>
          ).
        </div>

        {loading ? (
          <p className="text-stone-500">Loading…</p>
        ) : (
          <>
            {tab === "overview" && (
              <section className="space-y-4">
                <div>
                  <h1 className="font-display text-3xl text-stone-900 md:text-4xl">Pipeline</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-600">
                    Columns follow each job’s real status: publish moves a job to{" "}
                    <em className="not-italic font-medium text-stone-800">Client reviewing</em>; when the client submits
                    picks in the shared gallery, it moves to <em className="not-italic font-medium text-stone-800">Selections in</em>.
                    Drag cards anytime to override.
                  </p>
                </div>
                <PipelineBoard galleries={galleries} onStatusChange={onStatusChange} />
              </section>
            )}

            {tab === "jobs" && (
              <section className="space-y-6">
                <div>
                  <h1 className="font-display text-3xl text-stone-900">Jobs</h1>
                  <p className="mt-1 text-sm text-stone-600">Couples, dates, package — CRM-lite.</p>
                </div>
                <form onSubmit={onCreateJob} className="flex flex-wrap gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="New job title"
                    className="min-w-[200px] flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={creating}
                    className="rounded-full bg-stone-900 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white"
                  >
                    {creating ? "…" : "Add job"}
                  </button>
                </form>
                <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-stone-100 bg-stone-50 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                      <tr>
                        <th className="px-4 py-3">Job</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Proofs</th>
                        <th className="px-4 py-3">Picks</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {galleries.map((g) => (
                        <tr key={g.id} className="border-b border-stone-50">
                          <td className="px-4 py-3 font-medium text-stone-900">{g.title}</td>
                          <td className="px-4 py-3 text-stone-600">{g.status.replace(/_/g, " ")}</td>
                          <td className="px-4 py-3">{g.photoCount}</td>
                          <td className="px-4 py-3">{g.picksCount}</td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/dashboard/galleries/${g.id}`}
                              className="text-sky-700 underline-offset-2 hover:underline"
                            >
                              Upload
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-4 text-sm">
                  <Link href="/dashboard/favorites" className="text-sky-800 underline-offset-2 hover:underline">
                    Client favorites →
                  </Link>
                  <Link href="/dashboard/selections" className="text-sky-800 underline-offset-2 hover:underline">
                    Client selections →
                  </Link>
                </div>
              </section>
            )}

            {tab === "client" && (
              <section className="space-y-8">
                <div>
                  <h1 className="font-display text-3xl text-stone-900">Client link</h1>
                  <p className="mt-2 max-w-3xl text-sm text-stone-600">
                    Name the album, upload proofs, tune access, then publish — photos you add appear in the client
                    gallery for this job.
                  </p>
                </div>

                <form onSubmit={saveClientSection} className="space-y-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
                  <label className="block text-sm">
                    <span className="font-medium text-stone-800">Job</span>
                    <select
                      value={clientGalleryId}
                      onChange={(e) => setClientGalleryId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                    >
                      {galleries.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-stone-800">Album name</span>
                    <p className="text-xs text-stone-500">
                      This title is sent in the share link and appears as the main heading in the client gallery.
                    </p>
                    <input
                      value={albumTitle}
                      onChange={(e) => setAlbumTitle(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-stone-800">Subtitle</span>
                    <input
                      value={albumSubtitle}
                      onChange={(e) => setAlbumSubtitle(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-stone-800">Client label</span>
                    <input
                      value={clientLabel}
                      onChange={(e) => setClientLabel(e.target.value)}
                      placeholder="e.g. Demo couple"
                      className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                    />
                  </label>

                  <div>
                    <h2 className="text-sm font-semibold text-stone-900">Access rules</h2>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <label className="text-xs">
                        Gallery password (optional)
                        <input
                          type="password"
                          value={galleryPassword}
                          onChange={(e) => setGalleryPassword(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
                        />
                      </label>
                      <label className="text-xs">
                        Max selects (optional)
                        <input
                          value={maxSelects}
                          onChange={(e) => setMaxSelects(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
                        />
                      </label>
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={lockAfterSubmit}
                        onChange={(e) => setLockAfterSubmit(e.target.checked)}
                      />
                      Lock gallery after client submits
                    </label>
                    <label className="mt-2 flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={allowReopen} onChange={(e) => setAllowReopen(e.target.checked)} />
                      Allow reopen after lock
                    </label>
                  </div>

                  <div className="border-t border-stone-100 pt-6">
                    <h2 className="text-sm font-semibold text-stone-900">Publish to client gallery</h2>
                    <p className="mt-1 text-xs text-stone-500">
                      Set status to Client reviewing and share the link below. Upload proofs from{" "}
                      <Link href={clientGalleryId ? `/dashboard/galleries/${clientGalleryId}` : "#"} className="text-sky-700 underline">
                        Upload & manage
                      </Link>
                      .
                    </p>
                    <label className="mt-3 block text-xs">
                      Client gallery website (optional base URL)
                      <input
                        value={clientBaseUrl}
                        onChange={(e) => setClientBaseUrl(e.target.value)}
                        placeholder={origin}
                        className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
                      />
                    </label>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void publishToClient()}
                        className="rounded-full bg-sky-700 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white"
                      >
                        Publish
                      </button>
                      <button
                        type="submit"
                        disabled={savingClient}
                        className="rounded-full border border-stone-300 px-5 py-2 text-xs font-semibold uppercase tracking-wider"
                      >
                        {savingClient ? "Saving…" : "Save"}
                      </button>
                    </div>
                    {shareUrl && (
                      <p className="mt-4 break-all text-xs text-stone-600">
                        <span className="font-medium text-stone-800">Client gallery link:</span> {shareUrl}
                      </p>
                    )}
                  </div>
                </form>
              </section>
            )}

            {tab === "settings" && (
              <section className="space-y-4">
                <h1 className="font-display text-3xl text-stone-900">Settings</h1>
                <p className="text-sm text-stone-600">Storage estimate and future integrations.</p>
                <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-stone-800">Plan (demo)</p>
                  <p className="mt-1 text-2xl font-light text-stone-900">50 GB</p>
                  <p className="text-xs text-stone-500">simulated limit</p>
                  <hr className="my-4 border-stone-100" />
                  <p className="text-sm text-stone-600">
                    Billing & integrations — connect when you add a backend billing API.
                  </p>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {tourOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="max-w-md rounded-2xl bg-sky-700 p-8 text-white shadow-2xl"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
            >
              <h2 className="font-display text-2xl">{tourSlides[tourStep]?.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-sky-100">{tourSlides[tourStep]?.body}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (tourStep < tourSlides.length - 1) setTourStep((s) => s + 1);
                    else {
                      setTourOpen(false);
                      localStorage.setItem("pickaphoto_tour_done", "1");
                    }
                  }}
                  className="rounded-full bg-stone-900 px-6 py-2.5 text-sm font-semibold text-white"
                >
                  {tourStep < tourSlides.length - 1 ? "Next" : "Done"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTourOpen(false);
                    localStorage.setItem("pickaphoto_tour_done", "1");
                  }}
                  className="text-sm text-sky-200 underline-offset-2 hover:underline"
                >
                  Skip tour
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
