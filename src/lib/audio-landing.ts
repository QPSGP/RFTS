import type { LibraryItem } from "@/lib/types";
import { lookupRecordingDescription } from "@/lib/library-metadata";
import { stripSkuHyphens } from "@/lib/sku-code";

export const AUDIO_LANDING_PATH_PREFIX = "/audio";

const SIGNUP = "/signup/step-1-subscription-selection";

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

function summaryForItem(item: LibraryItem): string {
  const fromItem = (item.description || "").trim();
  if (fromItem) return fromItem;
  if (item.skuCode) {
    const fromCatalog = lookupRecordingDescription(item.skuCode).trim();
    if (fromCatalog) return fromCatalog;
  }
  return "A guided audio session from the Reach For The Stars library — personalized for your nightly goals.";
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
    metaDescription:
      summary.length > 155 ? `${summary.slice(0, 152).trim()}…` : summary,
    summary,
    transcriptSnippet: transcriptSnippetFromSummary(summary, title),
    transcriptLabel: item.skuCode
      ? `Guided session excerpt · ${stripSkuHyphens(item.skuCode)}`
      : "Guided session excerpt",
    coverUrl: item.coverUrl,
    signupHref: SIGNUP
  };
}

export function buildAllAudioLandingContent(library: LibraryItem[]): AudioLandingContent[] {
  return library
    .filter((item) => item.audioUrl?.trim())
    .map((item) => buildAudioLandingContent(item, library))
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
