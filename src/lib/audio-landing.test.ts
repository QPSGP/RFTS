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
import {
  findRelatedAudioLandingsForGoal,
  findRelatedAudioLandingsForTopic,
  normalizeRelatedSku
} from "./audio-landing-relations";
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

  it("uses the first sentence as the landing summary", () => {
    const library = [
      item({
        id: "x",
        title: "Abundance",
        skuCode: "T18",
        description:
          "This recording brings you material abundance plus joy. Specific hypnotic suggestions help you get a job."
      })
    ];
    const content = buildAudioLandingContent(library[0], library);
    expect(content.summary).toBe("This recording brings you material abundance plus joy.");
    expect(content.summary).not.toContain("Specific hypnotic");
    expect(content.metaDescription).toContain("material abundance");
    expect(content.metaDescription).not.toContain("Specific hypnotic");
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

  it("omits T04 from related audios on the health goal page", () => {
    const library = [
      item({
        id: "t04",
        title: "Health & Rejuvenation",
        skuCode: "T04",
        description: "HEALTH AND REJUVENATION Eliminate the age myths."
      }),
      item({
        id: "t58",
        title: "Health Rejuvenation & Physical Balance",
        skuCode: "T58",
        description: "You can achieve health."
      }),
      item({
        id: "t40",
        title: "Heart Health Meditation",
        skuCode: "T40",
        description: "Rejuvenate and heal your heart."
      })
    ];
    const related = findRelatedAudioLandingsForGoal("health", library);
    expect(related.map((row) => normalizeRelatedSku(row.skuCode))).not.toContain("T04");
    expect(related.map((row) => normalizeRelatedSku(row.skuCode))).toContain("T58");
  });

  it("uses Terry's wealth related SKUs and omits T19 and T20", () => {
    const library = [
      item({ id: "t19", title: "Abundance For Hypnotists", skuCode: "T19", description: "Financial abundance for hypnotists." }),
      item({ id: "t20", title: "Abundance for Success Center Associates", skuCode: "T20", description: "Financial abundance." }),
      item({ id: "t35", title: "Sales Pride, Sales Excellence", skuCode: "T35", description: "Sales pride for business owners." }),
      item({ id: "t33", title: "Sales Pride, Sales Excellence for MLM", skuCode: "T33", description: "Sales pride for network marketers." }),
      item({ id: "s01d", title: "Energy for Success", skuCode: "S01 D", description: "Energy for success." })
    ];
    const related = findRelatedAudioLandingsForGoal("wealth", library);
    const skus = related.map((row) => normalizeRelatedSku(row.skuCode));
    expect(skus).toEqual(["T35", "T33"]);
    expect(skus).not.toContain("T19");
    expect(skus).not.toContain("T20");
  });

  it("prefers S01A over T03 and omits CV19 variants", () => {
    const library = [
      item({ id: "t03", title: "From Stress to Success", skuCode: "T03", description: "Turn stress into success." }),
      item({ id: "s01a", title: "From Stress to Success", skuCode: "S01 A", description: "Turn stress into success." }),
      item({
        id: "cv",
        title: "Positive Stress Management for CV19",
        skuCode: "T54CV19",
        description: "Immune support for CV19."
      })
    ];
    const related = findRelatedAudioLandingsForTopic("stress-relief", library);
    const skus = related.map((row) => normalizeRelatedSku(row.skuCode));
    expect(skus[0]).toBe("S01A");
    expect(skus).not.toContain("T03");
    expect(skus).not.toContain("T54CV19");
  });

  it("does not fill related slots with unrelated SKU-only matches", () => {
    const library = [
      item({ id: "t16", title: "Sleep Well, Stop Snoring", skuCode: "T16", description: "Sleep comfortably." }),
      item({ id: "t15", title: "Sleep Well Anytime, Anywhere", skuCode: "T15", description: "Sleep easily on planes." }),
      item({
        id: "t20",
        title: "Abundance for Success Center Associates",
        skuCode: "T20",
        description: "Financial abundance for associates."
      })
    ];
    const related = findRelatedAudioLandingsForTopic("sleep-meditation", library);
    const skus = related.map((row) => normalizeRelatedSku(row.skuCode));
    expect(skus).toEqual(["T16", "T15"]);
    expect(skus).not.toContain("T20");
  });

  it("keeps student memory tracks on memory-improvement, not /memory", () => {
    const library = [
      item({ id: "t26", title: "Memory Excellence, Lifelong", skuCode: "T26", description: "Sharp memory in later years." }),
      item({ id: "s01b", title: "The Will to Learn for Success", skuCode: "S01 B", description: "Learn for success." }),
      item({ id: "t04", title: "Health & Rejuvenation", skuCode: "T04", description: "Vibrant health." }),
      item({
        id: "t14",
        title: "Memory Excellence and the Will to Learn for Students",
        skuCode: "T14",
        description: "Memory excellence for students."
      })
    ];
    const memory = findRelatedAudioLandingsForGoal("memory", library).map((row) =>
      normalizeRelatedSku(row.skuCode)
    );
    const students = findRelatedAudioLandingsForTopic("memory-improvement", library).map((row) =>
      normalizeRelatedSku(row.skuCode)
    );
    expect(memory[0]).toBe("T26");
    expect(memory).not.toContain("T14");
    expect(students[0]).toBe("T14");
  });

  it("puts T59 first on will-power and keeps End Procrastination when present", () => {
    const library = [
      item({ id: "t59", title: "Habit Control", skuCode: "T59", description: "Replace unwanted habits." }),
      item({ id: "t02", title: "End Procrastination", skuCode: "T02", description: "Get things done on time." }),
      item({ id: "s01c", title: "Magical Time Management", skuCode: "S01 C", description: "Use time well." }),
      item({ id: "s01b", title: "The Will to Learn for Success", skuCode: "S01 B", description: "Learn for success." }),
      item({ id: "t14", title: "Memory Excellence for Students", skuCode: "T14", description: "Will to learn for students." })
    ];
    const skus = findRelatedAudioLandingsForTopic("will-power", library).map((row) =>
      normalizeRelatedSku(row.skuCode)
    );
    expect(skus).toEqual(["T59", "T02"]);
    expect(skus).not.toContain("T14");
  });

  it("shows two related audios on landing pages", () => {
    const library = [
      item({ id: "t58", title: "Health Rejuvenation", skuCode: "T58", description: "Health and balance." }),
      item({ id: "t29", title: "Heal and Prevent Herpes", skuCode: "T29", description: "Healthy effective immune system." }),
      item({ id: "t40", title: "Heart Health Meditation", skuCode: "T40", description: "Heart health." }),
      item({ id: "t54", title: "Positive Stress Management", skuCode: "T54", description: "Stress and immune health." })
    ];
    const related = findRelatedAudioLandingsForGoal("health", library);
    expect(related).toHaveLength(2);
    expect(related.map((row) => normalizeRelatedSku(row.skuCode))).toEqual(["T58", "T29"]);
  });

  it("keeps relationship related audios to T23 and T12 without T19 or T38", () => {
    const library = [
      item({ id: "t23", title: "Relationship Joy for Couples", skuCode: "T23", description: "Fall in love again." }),
      item({ id: "t12", title: "Attract Your Special Someone", skuCode: "T12", description: "Attract the relationship you seek." }),
      item({ id: "s01a", title: "From Stress to Success", skuCode: "S01 A", description: "Turn stress into success." }),
      item({ id: "t04", title: "Health & Rejuvenation", skuCode: "T04", description: "Vibrant health." }),
      item({
        id: "t19",
        title: "Abundance For Hypnotists",
        skuCode: "T19",
        description: "Joyous fulfillment for hypnotists."
      }),
      item({
        id: "t38",
        title: "Relationship Joy for Couples with Issues",
        skuCode: "T38",
        description: "Resolve relationship issues."
      })
    ];
    const skus = findRelatedAudioLandingsForGoal("relationship", library).map((row) =>
      normalizeRelatedSku(row.skuCode)
    );
    expect(skus).toEqual(["T23", "T12"]);
    expect(skus).not.toContain("T19");
    expect(skus).not.toContain("T38");
  });
});
