import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

const COOKIE = "gallery_visitor_id";
const MAX_AGE = 60 * 60 * 24 * 400;

export function getOrCreateVisitorId(): string {
  const jar = cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) {
    return existing;
  }
  const id = randomUUID();
  jar.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return id;
}

export function getVisitorIdFromCookie(): string | null {
  const jar = cookies();
  const v = jar.get(COOKIE)?.value;
  if (v && /^[0-9a-f-]{36}$/i.test(v)) return v;
  return null;
}
