import {
  getFacilitatorLgdSettings,
  getFacilitatorsForMemberEmail,
  listModerators
} from "@/lib/db";
import { isAdminSession } from "@/lib/auth";
import {
  defaultLgdFacilitatorFeatureFlags,
  type LgdFacilitatorFeatureFlags,
  type LgdFacilitatorFeatureKey,
  LGD_FACILITATOR_FEATURE_FLAGS
} from "@/lib/lgd-intake";

/**
 * When true (default), LGD intake/review is only for the super-admin console.
 * Set LGD_ADMIN_ONLY=false to open to members/facilitators/public per feature flags.
 */
export function isLgdAdminOnlyMode(): boolean {
  const v = (process.env.LGD_ADMIN_ONLY ?? "true").trim().toLowerCase();
  return v !== "false" && v !== "0" && v !== "off" && v !== "no";
}

/** Whether the current session may use LGD member/facilitator surfaces. */
export async function canAccessLgdSurfaces(): Promise<boolean> {
  if (!isLgdAdminOnlyMode()) return true;
  return isAdminSession();
}

export function mergeStoredLgdFlags(
  stored: Record<string, boolean> | null | undefined
): LgdFacilitatorFeatureFlags {
  const defaults = defaultLgdFacilitatorFeatureFlags();
  if (!stored || typeof stored !== "object") return defaults;
  const merged = { ...defaults };
  for (const flag of LGD_FACILITATOR_FEATURE_FLAGS) {
    if (typeof stored[flag.key] === "boolean") {
      merged[flag.key] = stored[flag.key];
    }
  }
  return merged;
}

/** OR across facilitators for “offer” style flags; AND for restrictive ones where noted. */
function combineFlags(
  flagSets: LgdFacilitatorFeatureFlags[]
): LgdFacilitatorFeatureFlags {
  if (!flagSets.length) return defaultLgdFacilitatorFeatureFlags();
  const result = defaultLgdFacilitatorFeatureFlags();
  const orKeys: LgdFacilitatorFeatureKey[] = [
    "lgdElectronicIntake",
    "lgdScriptDraft",
    "lgdProfessionalVoices",
    "lgdMemberOwnVoice",
    "lgdFrequencyBeds",
    "lgdPublicOffer",
    "lgdMemberConsoleOffer"
  ];
  for (const key of orKeys) {
    result[key] = flagSets.some((f) => f[key]);
  }
  // If any assigned facilitator requires approval, require it.
  result.lgdRequireFacilitatorApproval = flagSets.some(
    (f) => f.lgdRequireFacilitatorApproval
  );
  return result;
}

export async function getLgdFlagsForMemberEmail(
  memberEmail: string
): Promise<{
  flags: LgdFacilitatorFeatureFlags;
  primaryFacilitatorId: string | null;
}> {
  const facilitators = await getFacilitatorsForMemberEmail(memberEmail);
  if (!facilitators.length) {
    return { flags: defaultLgdFacilitatorFeatureFlags(), primaryFacilitatorId: null };
  }
  const flagSets: LgdFacilitatorFeatureFlags[] = [];
  for (const fac of facilitators) {
    const stored = await getFacilitatorLgdSettings(fac.id);
    flagSets.push(mergeStoredLgdFlags(stored));
  }
  return {
    flags: combineFlags(flagSets),
    primaryFacilitatorId: facilitators[0]?.id ?? null
  };
}

export async function getLgdFlagsForModeratorId(
  moderatorId: string
): Promise<LgdFacilitatorFeatureFlags> {
  const stored = await getFacilitatorLgdSettings(moderatorId);
  return mergeStoredLgdFlags(stored);
}

/** Public site: show LGD marketing if any active facilitator allows it (or defaults if none). */
export async function getPublicLgdOfferEnabled(): Promise<boolean> {
  if (isLgdAdminOnlyMode()) return false;
  const moderators = await listModerators();
  const active = moderators.filter((m) => m.status === "active");
  if (!active.length) return defaultLgdFacilitatorFeatureFlags().lgdPublicOffer;
  const flagSets: LgdFacilitatorFeatureFlags[] = [];
  for (const mod of active) {
    flagSets.push(mergeStoredLgdFlags(await getFacilitatorLgdSettings(mod.id)));
  }
  return combineFlags(flagSets).lgdPublicOffer;
}

/** Stripe product for Life Guidance Discovery / CGMR packaging ($397). */
export const LGD_STRIPE_PRODUCT_ID =
  process.env.STRIPE_LGD_PRODUCT_ID?.trim() || "prod_I7hhOenF6qstnH";

export const LGD_DEFAULT_PRICE_CENTS = 39700;

export function getLgdPriceDisplay(): {
  priceCents: number | null;
  label: string | null;
} {
  const raw = process.env.NEXT_PUBLIC_LGD_PRICE_DISPLAY?.trim();
  const centsRaw = process.env.LGD_PRICE_CENTS || process.env.NEXT_PUBLIC_LGD_PRICE_CENTS;
  const cents = centsRaw != null && centsRaw !== "" ? parseInt(String(centsRaw), 10) : NaN;
  const priceCents =
    Number.isFinite(cents) && cents > 0 ? cents : LGD_DEFAULT_PRICE_CENTS;
  if (raw) return { priceCents, label: raw };
  return { priceCents, label: `$${(priceCents / 100).toFixed(2)}` };
}

/** Preferred production path: AI/internal first; studio (e.g. Paul Griffin) as fallback. */
export type LgdVoiceProductionMode = "ai_internal" | "studio_external" | "member_own";

export function getLgdVoiceProductionMode(
  voiceId: string | null | undefined
): LgdVoiceProductionMode {
  if (voiceId === "member_own") return "member_own";
  const preferred = (process.env.LGD_VOICE_PRODUCTION || "ai_internal").trim().toLowerCase();
  if (preferred === "studio" || preferred === "studio_external") return "studio_external";
  return "ai_internal";
}
