import {
  buildAudioLandingContent,
  buildIndexableAudioLandingContent,
  buildSeoMetaDescription,
  isExcludedFromAudioLanding,
  isIndexableAudioLanding,
  isPrivateFacilitatorAudio,
  isUtilityAudioTrack,
  libraryItemsForAudioLanding,
  resolveAudioLandingSlug
} from "./audio-landing";
import { findRelatedAudioLandingsForTopic } from "./audio-landing-relations";
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
    expect(content.metaDescription).toContain("14-day free trial");
  });

  it("builds SEO meta description with trial hook", () => {
    const description = buildSeoMetaDescription("Sleep comfortably and wake refreshed.");
    expect(description).toContain("14-day free trial");
    expect(description).toContain("Sleep comfortably");
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

  it("excludes private facilitator and utility tracks from indexable set", () => {
    const library = [
      item({ id: "ok", title: "Sleep Well", skuCode: "T-16", description: "Sleep comfortably." }),
      item({
        id: "private",
        title: "Client Only",
        skuCode: "T-20",
        moderatorId: "mod-1",
        inGeneralCatalog: false
      }),
      item({ id: "interval", title: "Interval music 2hr30mins ramp out ramp in" }),
      item({ id: "cgmr", title: "Personal", skuCode: "MU-01", categories: ["cgmr"] })
    ];
    expect(isPrivateFacilitatorAudio(library[1])).toBe(true);
    expect(isUtilityAudioTrack(library[2])).toBe(true);
    expect(isIndexableAudioLanding(library[0])).toBe(true);
    expect(isIndexableAudioLanding(library[1])).toBe(false);
    expect(isIndexableAudioLanding(library[2])).toBe(false);
    expect(buildIndexableAudioLandingContent(library).map((page) => page.slug)).toEqual(["t-16"]);
  });

  it("ranks related audios for wellness topics", () => {
    const library = [
      item({ id: "sleep", title: "Sleep Well", skuCode: "T16", description: "Sleep comfortably." }),
      item({
        id: "stress",
        title: "From Stress to Success",
        skuCode: "T03",
        description: "React to stressful situations with calm."
      })
    ];
    const related = findRelatedAudioLandingsForTopic("sleep-meditation", library);
    expect(related[0]?.slug).toBe("t16");
  });
});
