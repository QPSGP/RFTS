import type { LibraryItem } from "@/lib/types";
import { lookupRecordingDescription } from "@/lib/library-metadata";
import { stripSkuHyphens } from "@/lib/sku-code";
import { buildMarketingSignupHref } from "@/lib/marketing-signup";

export const AUDIO_LANDING_PATH_PREFIX = "/audio";

const SIGNUP = buildMarketingSignupHref();

export type AudioLandingContent = {
  slug: string;
  path: string;
  libraryItemId: string;
  title: string;
  skuCode?: string;
  metaTitle: string;
  metaDescription: string;
  summary: string;
  transcriptSnippet: string;
  transcriptLabel: string;
  coverUrl: string;
  signupHref: string;
};

function slugBaseFromItem(item: LibraryItem): string {
  if (item.skuCode?.trim()) {
    return item.skuCode
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  return item.id;
}

/** Stable public slug for /audio/[slug] — suffix id when SKU collides. */
export function resolveAudioLandingSlug(item: LibraryItem, allItems: LibraryItem[]): string {
  const base = slugBaseFromItem(item);
  if (!base) return item.id;
  const sameBase = allItems.filter((other) => slugBaseFromItem(other) === base);
  if (sameBase.length > 1) {
    return `${base}-${item.id.slice(0, 8)}`;
  }
  return base;
}

export function audioLandingPath(slug: string): string {
  return `${AUDIO_LANDING_PATH_PREFIX}/${slug}`;
}

export function isExcludedFromAudioLanding(item: LibraryItem): boolean {
  const isCgmr = (item.categories || []).some((category) => category.toLowerCase() === "cgmr");
  return isCgmr || !!item.isAdult;
}

/** Facilitator member-only uploads — page may exist for staff preview but must not be indexed. */
export function isPrivateFacilitatorAudio(item: LibraryItem): boolean {
  return Boolean(item.moderatorId) && item.inGeneralCatalog === false;
}

/** Non-marketing utility tracks (interval music, etc.). */
export function isUtilityAudioTrack(item: LibraryItem): boolean {
  const title = (item.title || "").toLowerCase();
  if (/interval\s+music/.test(title)) return true;
  if (/ramp\s+out|ramp\s+in/.test(title)) return true;
  if (/^prep(?:aration)?\b/.test(title)) return true;
  return false;
}

/** Eligible for Google indexing and sitemap — public catalog tracks only. */
export function isIndexableAudioLanding(item: LibraryItem): boolean {
  if (!item.audioUrl?.trim()) return false;
  if (isExcludedFromAudioLanding(item)) return false;
  if (isPrivateFacilitatorAudio(item)) return false;
  if (isUtilityAudioTrack(item)) return false;
  return true;
}

/** Library rows that may have a public /audio/[slug] marketing page. */
export function libraryItemsForAudioLanding(library: LibraryItem[]): LibraryItem[] {
  return library.filter(
    (item) => item.audioUrl?.trim() && !isExcludedFromAudioLanding(item)
  );
}

/** Subset of audio landing pages that should be indexed and listed in the sitemap. */
export function libraryItemsForIndexableAudioLanding(library: LibraryItem[]): LibraryItem[] {
  return library.filter(isIndexableAudioLanding);
}

function summaryForItem(item: LibraryItem): string {
  const fromItem = (item.description || "").trim();
  if (fromItem) return fromItem;
  if (item.skuCode) {
    const fromCatalog = lookupRecordingDescription(item.skuCode).trim();
    if (fromCatalog) return fromCatalog;
  }
  return "A guided audio session from the Reach For The Stars library — personalized for your nightly goals.";
}

const SEO_META_HOOK = "14-day free trial — hear it in your nightly rotation.";

/** Meta description with trial hook for search snippets. */
export function buildSeoMetaDescription(summary: string): string {
  const trimmed = summary.trim();
  const maxSummaryLen = Math.max(60, 160 - SEO_META_HOOK.length - 1);
  const base =
    trimmed.length > maxSummaryLen ? `${trimmed.slice(0, maxSummaryLen - 1).trim()}…` : trimmed;
  return base ? `${base} ${SEO_META_HOOK}` : SEO_META_HOOK;
}

function transcriptSnippetFromSummary(summary: string, title: string): string {
  const text = summary.trim();
  if (!text) {
    return `…allow your mind to receive supportive messages for ${title.toLowerCase()}… each breath brings calm and clarity…`;
  }
  const sentence = text.split(/(?<=[.!?])\s+/)[0] || text;
  const snippet = sentence.length > 280 ? `${sentence.slice(0, 277).trim()}…` : sentence;
  if (snippet.startsWith("…") || snippet.startsWith("...")) return snippet;
  return snippet.endsWith("…") ? snippet : `${snippet.replace(/[.!?]$/, "")}…`;
}

export function buildAudioLandingContent(
  item: LibraryItem,
  allItems: LibraryItem[]
): AudioLandingContent {
  const slug = resolveAudioLandingSlug(item, allItems);
  const title = item.title?.trim() || "Guided audio session";
  const summary = summaryForItem(item);
  const skuLabel = item.skuCode ? `${item.skuCode} — ` : "";

  return {
    slug,
    path: audioLandingPath(slug),
    libraryItemId: item.id,
    title,
    skuCode: item.skuCode,
    metaTitle: `${skuLabel}${title} | Reach For The Stars`,
    metaDescription: buildSeoMetaDescription(summary),
    summary,
    transcriptSnippet: transcriptSnippetFromSummary(summary, title),
    transcriptLabel: item.skuCode
      ? `Guided session excerpt · ${stripSkuHyphens(item.skuCode)}`
      : "Guided session excerpt",
    coverUrl: item.coverUrl,
    signupHref: SIGNUP
  };
}

export function buildIndexableAudioLandingContent(library: LibraryItem[]): AudioLandingContent[] {
  const eligible = libraryItemsForIndexableAudioLanding(library);
  return eligible
    .map((item) => buildAudioLandingContent(item, eligible))
    .sort((a, b) => {
      const skuA = (a.skuCode || "").trim();
      const skuB = (b.skuCode || "").trim();
      if (skuA && skuB) {
        return skuA.localeCompare(skuB, undefined, { numeric: true, sensitivity: "base" });
      }
      if (skuA) return -1;
      if (skuB) return 1;
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    });
}

export function buildAllAudioLandingContent(library: LibraryItem[]): AudioLandingContent[] {
  const eligible = libraryItemsForAudioLanding(library);
  return eligible
    .map((item) => buildAudioLandingContent(item, eligible))
    .sort((a, b) => {
      const skuA = (a.skuCode || "").trim();
      const skuB = (b.skuCode || "").trim();
      if (skuA && skuB) {
        return skuA.localeCompare(skuB, undefined, { numeric: true, sensitivity: "base" });
      }
      if (skuA) return -1;
      if (skuB) return 1;
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    });
}

export function findAudioLandingBySlug(
  slug: string,
  library: LibraryItem[]
): AudioLandingContent | undefined {
  const pages = buildAllAudioLandingContent(library);
  return pages.find((page) => page.slug === slug);
}

export function findLibraryItemByAudioLandingSlug(
  slug: string,
  library: LibraryItem[]
): LibraryItem | undefined {
  const eligible = libraryItemsForAudioLanding(library);
  return eligible.find((item) => resolveAudioLandingSlug(item, eligible) === slug);
}
