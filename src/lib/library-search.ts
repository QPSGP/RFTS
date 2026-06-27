import type { Interest, LibraryItem } from "@/lib/types";

export type SearchableLibraryItem = Pick<
  LibraryItem,
  "title" | "description" | "skuCode" | "fileName" | "categories" | "interestIds"
>;

function normalizeSearchText(value: string | undefined | null): string {
  return (value || "").trim().toLowerCase();
}

/** Build searchable text for a library item (title, SKU, description, categories, goals). */
export function libraryItemSearchText(
  item: SearchableLibraryItem,
  interestNameById?: Map<string, string>
): string {
  const goalNames = (item.interestIds || [])
    .map((id) => interestNameById?.get(id))
    .filter((name): name is string => Boolean(name));

  return [
    item.title,
    item.skuCode,
    item.description,
    item.fileName,
    ...(item.categories || []),
    ...goalNames
  ]
    .map(normalizeSearchText)
    .filter(Boolean)
    .join(" ");
}

/** Match library items by one or more keywords (all tokens must match somewhere). */
export function libraryItemMatchesSearch(
  item: SearchableLibraryItem,
  query: string,
  interestNameById?: Map<string, string>
): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const haystack = libraryItemSearchText(item, interestNameById);
  const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
}

export function buildInterestNameMap(interests: Interest[]): Map<string, string> {
  return new Map(interests.map((interest) => [interest.id, interest.name]));
}

export function filterLibraryBySearch<T extends SearchableLibraryItem>(
  items: T[],
  query: string,
  interests: Interest[] = []
): T[] {
  const interestNameById = buildInterestNameMap(interests);
  return items.filter((item) => libraryItemMatchesSearch(item, query, interestNameById));
}
