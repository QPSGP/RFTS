import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveModerator } from "@/lib/moderator-member-access";
import { getFacilitatorLgdSettings, upsertFacilitatorLgdSettings } from "@/lib/db";
import {
  LGD_FACILITATOR_FEATURE_FLAGS,
  defaultLgdFacilitatorFeatureFlags,
  type LgdFacilitatorFeatureFlags,
  type LgdFacilitatorFeatureKey
} from "@/lib/lgd-intake";

function mergeFlags(stored: Record<string, boolean>): LgdFacilitatorFeatureFlags {
  const defaults = defaultLgdFacilitatorFeatureFlags();
  const merged = { ...defaults };
  for (const flag of LGD_FACILITATOR_FEATURE_FLAGS) {
    if (typeof stored[flag.key] === "boolean") {
      merged[flag.key] = stored[flag.key];
    }
  }
  return merged;
}

export async function GET() {
  const moderator = await requireActiveModerator();
  if ("error" in moderator) {
    return NextResponse.json({ error: moderator.error }, { status: moderator.status });
  }
  const stored = await getFacilitatorLgdSettings(moderator.id);
  return NextResponse.json({
    flags: mergeFlags(stored),
    catalog: LGD_FACILITATOR_FEATURE_FLAGS
  });
}

const patchSchema = z.object({
  flags: z.record(z.string(), z.boolean())
});

export async function PATCH(request: Request) {
  const moderator = await requireActiveModerator();
  if ("error" in moderator) {
    return NextResponse.json({ error: moderator.error }, { status: moderator.status });
  }
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const allowedKeys = new Set(
    LGD_FACILITATOR_FEATURE_FLAGS.map((f) => f.key as LgdFacilitatorFeatureKey)
  );
  const next = mergeFlags(await getFacilitatorLgdSettings(moderator.id));
  for (const [key, value] of Object.entries(parsed.data.flags)) {
    if (allowedKeys.has(key as LgdFacilitatorFeatureKey)) {
      next[key as LgdFacilitatorFeatureKey] = value;
    }
  }
  const saved = await upsertFacilitatorLgdSettings(moderator.id, next);
  return NextResponse.json({ flags: mergeFlags(saved) });
}
