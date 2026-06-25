/** Client-safe SKU normalization (no Node fs). */

export const stripSkuHyphens = (code: string): string =>
  code.trim().toUpperCase().replace(/-/g, "");

export const normalizeSkuCode = (prefix: string, number: string, suffix?: string) => {
  const padded = number.length === 1 ? number.padStart(2, "0") : number;
  return stripSkuHyphens(`${prefix}${padded}${suffix ?? ""}`);
};
