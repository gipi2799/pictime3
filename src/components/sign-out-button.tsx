"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-full border border-ink-200 px-4 py-1.5 text-xs font-medium text-ink-800 transition hover:bg-ink-100"
    >
      Sign out
    </button>
  );
}
