"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Row = {
  id: string;
  visitorId: string;
  photo: {
    id: string;
    filename: string;
    thumbUrl: string;
    galleryTitle: string;
    gallerySlug: string;
  };
};

export default function DashboardSelectionsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/dashboard/selections");
      if (!res.ok) return;
      const data = await res.json();
      setRows(data.selections);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <Link href="/dashboard" className="text-sm font-medium text-sky-800 hover:underline">
        ← Back to Studio
      </Link>
      <div>
        <h1 className="font-display text-4xl text-ink-950">Client selections</h1>
        <p className="mt-2 text-ink-600">
          Checkbox picks from your delivery galleries, per visitor session.
        </p>
      </div>
      {loading ? (
        <p className="text-ink-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-ink-600">No selections yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-ink-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.photo.thumbUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="space-y-1 px-4 py-3 text-sm">
                <p className="font-medium text-ink-900">{r.photo.galleryTitle}</p>
                <p className="text-xs text-ink-500">Visitor {r.visitorId.slice(0, 8)}…</p>
                <Link
                  href={`/gallery/${r.photo.gallerySlug}`}
                  className="text-xs font-medium text-ink-800 underline-offset-2 hover:underline"
                >
                  Open gallery
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
