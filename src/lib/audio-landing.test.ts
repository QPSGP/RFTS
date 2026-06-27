import {
  buildAudioLandingContent,
  isExcludedFromAudioLanding,
  libraryItemsForAudioLanding,
  resolveAudioLandingSlug
} from "./audio-landing";
import type { LibraryItem } from "@/lib/types";

const item = (overrides: Partial<LibraryItem> & Pick<LibraryItem, "id" | "title">): LibraryItem => ({
  description: "",
  coverUrl: "",
  audioUrl: "https://example.com/a.mp3",
  interestIds: [],
  createdAt: "2026-01-01",
  order: 1,
  ...overrides
});

describe("audio-landing", () => {
  it("builds slug from SKU", () => {
    const library = [
      item({ id: "a1", title: "Health", skuCode: "T-14" }),
      item({ id: "a2", title: "Other", skuCode: "T-15" })
    ];
    expect(resolveAudioLandingSlug(library[0], library)).toBe("t-14");
  });

  it("suffixes slug when SKU collides", () => {
    const library = [
      item({ id: "aaaaaaaa-1111", title: "One", skuCode: "T-14" }),
      item({ id: "bbbbbbbb-2222", title: "Two", skuCode: "T-14" })
    ];
    const slug = resolveAudioLandingSlug(library[1], library);
    expect(slug.startsWith("t-14-")).toBe(true);
  });

  it("includes summary and transcript snippet", () => {
    const library = [
      item({
        id: "x",
        title: "Abundance",
        skuCode: "T18",
        description: "Financial abundance flows easily when the mind is calm."
      })
    ];
    const content = buildAudioLandingContent(library[0], library);
    expect(content.path).toBe("/audio/t18");
    expect(content.summary).toContain("abundance");
    expect(content.transcriptSnippet.length).toBeGreaterThan(10);
    expect(content.signupHref).toContain("/signup/");
  });

  it("excludes CGMR and adult content from audio landings", () => {
    const library = [
      item({ id: "ok", title: "Calm", skuCode: "T-01" }),
      item({
        id: "cgmr",
        title: "Personal",
        skuCode: "MU-01",
        categories: ["cgmr"]
      }),
      item({ id: "adult", title: "Adult track", skuCode: "T-99", isAdult: true })
    ];
    expect(isExcludedFromAudioLanding(library[1])).toBe(true);
    expect(isExcludedFromAudioLanding(library[2])).toBe(true);
    expect(libraryItemsForAudioLanding(library).map((row) => row.id)).toEqual(["ok"]);
  });
});
