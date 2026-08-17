import type { LibraryItem } from "@/lib/types";

/** Facilitator-uploaded track visible only to assigned members until admin promotes it. */
export function isFacilitatorPrivateLibraryItem(item: LibraryItem): boolean {
  return Boolean(item.moderatorId) && !item.inGeneralCatalog;
}

export function memberEmailOnLibraryAllowList(item: LibraryItem, memberEmail: string): boolean {
  const emailLower = memberEmail.trim().toLowerCase();
  return (item.allowedUserEmails || []).some((e) => e.trim().toLowerCase() === emailLower);
}

export function memberCanStreamLibraryItem(item: LibraryItem, memberEmail: string): boolean {
  if (!isFacilitatorPrivateLibraryItem(item)) return true;
  return memberEmailOnLibraryAllowList(item, memberEmail);
}

export function memberCanBrowseLibraryItem(item: LibraryItem, memberEmail: string | null): boolean {
  if (!isFacilitatorPrivateLibraryItem(item)) return true;
  if (!memberEmail) return false;
  return memberEmailOnLibraryAllowList(item, memberEmail);
}

export function isCgmrLibraryItem(item: { categories?: string[] }): boolean {
  return (item.categories || []).some((c) => c.toLowerCase() === "cgmr");
}

/** Member's current personalized CGMR = newest allow-listed CGMR by createdAt. */
export function pickNewestMemberCgmr(
  library: LibraryItem[],
  memberEmail: string
): LibraryItem | null {
  const emailLower = memberEmail.trim().toLowerCase();
  if (!emailLower) return null;
  const matches = library.filter(
    (item) =>
      isCgmrLibraryItem(item) &&
      (item.allowedUserEmails || []).some((e) => e.trim().toLowerCase() === emailLower)
  );
  if (matches.length === 0) return null;
  return matches.slice().sort((a, b) => {
    const ta = Date.parse(String(a.createdAt || "")) || 0;
    const tb = Date.parse(String(b.createdAt || "")) || 0;
    if (tb !== ta) return tb - ta;
    return String(b.id).localeCompare(String(a.id));
  })[0];
}
