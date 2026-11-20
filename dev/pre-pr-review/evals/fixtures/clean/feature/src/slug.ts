const MAX_SLUG_LENGTH = 80;

/**
 * Converts a title into a URL-safe slug made of lowercase ASCII letters, digits and single hyphens.
 * NFKD folds accents and compatibility forms to ASCII where it can ("Café" -> "cafe", "ﬁ" -> "fi"); any
 * other non-ASCII character acts as a separator. Returns "" when nothing usable remains.
 */
export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, "");
}
