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
