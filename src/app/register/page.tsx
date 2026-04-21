"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || undefined,
        email: email.trim().toLowerCase(),
        password,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Could not register.");
      return;
    }
    router.push("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-10 font-display text-2xl text-ink-900">
        Pickaphoto
      </Link>
      <h1 className="font-display text-3xl text-ink-950">Create account</h1>
      <p className="mt-2 text-sm text-ink-600">Set up your photographer workspace.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <label className="block text-sm font-medium text-ink-800">
          Name <span className="text-ink-400">(optional)</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-ink-900 shadow-sm outline-none transition focus:border-ink-400"
          />
        </label>
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
            minLength={6}
            autoComplete="new-password"
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
          {loading ? "Creating…" : "Register"}
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-ink-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-ink-900 underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
