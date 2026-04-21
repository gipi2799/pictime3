import Link from "next/link";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-ink-50 via-white to-ink-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(120,113,108,0.08),_transparent_55%)]" />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
        <span className="font-display text-2xl tracking-tight text-ink-900">Pickaphoto</span>
        <nav className="flex items-center gap-4 text-sm text-ink-600">
          {session ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-ink-900 px-5 py-2 text-white transition hover:bg-ink-800"
            >
              Studio
            </Link>
          ) : (
            <>
              <Link href="/login" className="hover:text-ink-900">
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-ink-900 px-5 py-2 text-white transition hover:bg-ink-800"
              >
                Create account
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-24 pt-16 text-center">
        <p className="animate-fade-in text-xs uppercase tracking-[0.35em] text-ink-500">
          Photo delivery
        </p>
        <h1 className="animate-slide-up mt-6 font-display text-5xl leading-tight text-ink-950 sm:text-6xl">
          Galleries that feel as refined as your work.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-600">
          Share proofing galleries with favorites, selections, and downloads — backed by PostgreSQL and S3-compatible storage, ready to deploy on Railway.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/gallery/paris-proposal"
            className="rounded-full border border-ink-200 bg-white px-8 py-3 text-sm font-medium text-ink-900 shadow-sm transition hover:border-ink-300 hover:shadow"
          >
            View demo gallery
          </Link>
          {!session && (
            <Link href="/register" className="text-sm text-ink-600 underline-offset-4 hover:underline">
              Start for free
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
