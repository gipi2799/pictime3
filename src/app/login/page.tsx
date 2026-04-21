"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
      callbackUrl,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-10 font-display text-2xl text-ink-900">
        Pickaphoto
      </Link>
      <h1 className="font-display text-3xl text-ink-950">Sign in</h1>
      <p className="mt-2 text-sm text-ink-600">
        Demo: <span className="font-mono text-ink-800">admin@test.com</span> /{" "}
        <span className="font-mono text-ink-800">123456</span>
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <label className="block text-sm font-medium text-ink-800">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-ink-900 shadow-sm outline-none transition focus:border-ink-400"
          />
        </label>
        <label className="block text-sm font-medium text-ink-800">
          Password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-ink-900 shadow-sm outline-none transition focus:border-ink-400"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-ink-900 py-3 text-sm font-medium text-white transition hover:bg-ink-800 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Continue"}
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-ink-600">
        No account?{" "}
        <Link href="/register" className="font-medium text-ink-900 underline-offset-4 hover:underline">
          Register
        </Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
          <p className="text-ink-500">Loading…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
