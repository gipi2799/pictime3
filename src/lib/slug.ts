export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function uniqueSlug(base: string, exists: (s: string) => Promise<boolean>): Promise<string> {
  let slug = slugify(base) || "gallery";
  let candidate = slug;
  let n = 0;
  while (await exists(candidate)) {
    n += 1;
    candidate = `${slug}-${n}`;
  }
  return candidate;
}
