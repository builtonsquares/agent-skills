import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates words", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("folds accents to base letters", () => {
    expect(slugify("Café Crème")).toBe("cafe-creme");
  });

  it("treats characters without an ASCII base as separators", () => {
    expect(slugify("Straße")).toBe("stra-e");
  });

  it("collapses punctuation runs and trims edge hyphens", () => {
    expect(slugify("  --Hi!! there--  ")).toBe("hi-there");
  });

  it("returns an empty string when nothing usable remains", () => {
    expect(slugify("!!!")).toBe("");
  });

  it("caps the length and drops a hyphen left at the cut", () => {
    // "abc-" repeats every 4 chars, so the 80-char cut lands on a hyphen (index 79).
    const slug = slugify("abc ".repeat(100));
    expect(slug).toHaveLength(79);
    expect(slug.endsWith("-")).toBe(false);
  });
});
