import {
  buildInterestNameMap,
  libraryItemMatchesSearch,
  libraryItemSearchText
} from "./library-search";
import type { LibraryItem } from "@/lib/types";

const baseItem: LibraryItem = {
  id: "1",
  title: "Peaceful Sleep Journey",
  description: "Relaxation for deep restorative rest",
  skuCode: "T-14",
  fileName: "peaceful-sleep.mp3",
  categories: ["General"],
  coverUrl: "",
  audioUrl: "https://example.com/a.mp3",
  interestIds: ["goal-health"],
  createdAt: "2026-01-01",
  order: 1
};

describe("libraryItemMatchesSearch", () => {
  const interestNameById = buildInterestNameMap([
    { id: "goal-health", name: "Health", buildPractice: false, order: 1 }
  ]);

  it("matches title and SKU tokens", () => {
    expect(libraryItemMatchesSearch(baseItem, "peaceful", interestNameById)).toBe(true);
    expect(libraryItemMatchesSearch(baseItem, "T-14", interestNameById)).toBe(true);
  });

  it("matches description keywords", () => {
    expect(libraryItemMatchesSearch(baseItem, "restorative", interestNameById)).toBe(true);
  });

  it("matches goal name", () => {
    expect(libraryItemMatchesSearch(baseItem, "health", interestNameById)).toBe(true);
  });

  it("requires all keywords to match", () => {
    expect(libraryItemMatchesSearch(baseItem, "peaceful health", interestNameById)).toBe(true);
    expect(libraryItemMatchesSearch(baseItem, "peaceful wealth", interestNameById)).toBe(false);
  });

  it("includes categories in searchable text", () => {
    expect(libraryItemSearchText(baseItem, interestNameById)).toContain("general");
  });
});
