import {
  getFacilitatorLgdSettings,
  getFacilitatorsForMemberEmail,
  listModerators
} from "@/lib/db";
import {
  defaultLgdFacilitatorFeatureFlags,
  type LgdFacilitatorFeatureFlags,
  type LgdFacilitatorFeatureKey,
  LGD_FACILITATOR_FEATURE_FLAGS
} from "@/lib/lgd-intake";

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
  const moderators = await listModerators();
  const active = moderators.filter((m) => m.status === "active");
  if (!active.length) return defaultLgdFacilitatorFeatureFlags().lgdPublicOffer;
  const flagSets: LgdFacilitatorFeatureFlags[] = [];
  for (const mod of active) {
    flagSets.push(mergeStoredLgdFlags(await getFacilitatorLgdSettings(mod.id)));
  }
  return combineFlags(flagSets).lgdPublicOffer;
}

export function getLgdPriceDisplay(): {
  priceCents: number | null;
  label: string | null;
} {
  const raw = process.env.NEXT_PUBLIC_LGD_PRICE_DISPLAY?.trim();
  const centsRaw = process.env.LGD_PRICE_CENTS || process.env.NEXT_PUBLIC_LGD_PRICE_CENTS;
  const cents = centsRaw != null && centsRaw !== "" ? parseInt(String(centsRaw), 10) : NaN;
  const priceCents = Number.isFinite(cents) && cents > 0 ? cents : null;
  if (raw) return { priceCents, label: raw };
  if (priceCents != null) {
    return { priceCents, label: `$${(priceCents / 100).toFixed(2)}` };
  }
  return { priceCents: null, label: null };
}
