import type { LibraryItem } from "@/lib/types";

/** Public path when a library item has no cover URL set. */
export const LIBRARY_COVER_PLACEHOLDER = "/covers/placeholder.svg";

export function libraryItemCoverSrc(item: Pick<LibraryItem, "coverUrl">): string {
  const u = (item.coverUrl || "").trim();
  return u || LIBRARY_COVER_PLACEHOLDER;
}
