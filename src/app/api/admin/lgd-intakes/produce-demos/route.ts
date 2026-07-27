import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { isAdminSession } from "@/lib/auth";
import { getLibraryItem, updateLibraryItem } from "@/lib/db";
import { isOpenAiTtsConfigured, produceLgdCgmrForIntake } from "@/lib/lgd-cgmr-produce";

/** Three long TTS jobs — allow up to 5 minutes on supported plans. */
export const maxDuration = 300;

const DEMO_SPECS = [
  { email: "lgd-demo-chris@rfts.demo", voiceId: "terry" },
  { email: "lgd-demo-jordan@rfts.demo", voiceId: "associate_warm" },
  { email: "lgd-demo-morgan@rfts.demo", voiceId: "associate_deep" }
] as const;

const LISTENER_EMAILS = [
  "richard@visimon.app",
  "lgd-demo-chris@rfts.demo",
  "lgd-demo-jordan@rfts.demo",
  "lgd-demo-morgan@rfts.demo"
];

/**
 * Produce hypnotic CGMR audio for the three LGD demo members (distinct voices),
 * assign each to their playlist, and grant listen access to richard@visimon.app.
 */
export async function POST() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isOpenAiTtsConfigured()) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on this deployment." },
      { status: 503 }
    );
  }

  const results: Array<{
    email: string;
    voiceId: string;
    ok: boolean;
    error?: string;
    libraryItemId?: string;
    audioUrl?: string;
    voiceLabel?: string;
  }> = [];

  for (const spec of DEMO_SPECS) {
    const { rows } = await sql<{ id: string; status: string }>`
      SELECT i.id, i.status
      FROM lgd_intakes i
      JOIN users u ON u.id = i.user_id
      WHERE lower(u.email) = ${spec.email}
      ORDER BY i.updated_at DESC
      LIMIT 1
    `;
    const intake = rows[0];
    if (!intake) {
      results.push({
        email: spec.email,
        voiceId: spec.voiceId,
        ok: false,
        error: "No intake found. Run npm run lgd:seed-demos first."
      });
      continue;
    }
    if (intake.status === "draft" || intake.status === "cancelled") {
      results.push({
        email: spec.email,
        voiceId: spec.voiceId,
        ok: false,
        error: `Intake status is ${intake.status}.`
      });
      continue;
    }

    await sql`
      UPDATE lgd_intakes
      SET
        voice_id = ${spec.voiceId},
        answers = jsonb_set(
          COALESCE(answers, '{}'::jsonb),
          '{voiceId}',
          to_jsonb(${spec.voiceId}::text),
          true
        ),
        updated_at = now()
      WHERE id = ${intake.id}
    `;

    const produced = await produceLgdCgmrForIntake({
      intakeId: intake.id,
      mode: "generate"
    });
    if (!produced.ok) {
      results.push({
        email: spec.email,
        voiceId: spec.voiceId,
        ok: false,
        error: produced.error
      });
      continue;
    }

    const item = await getLibraryItem(produced.libraryItemId);
    if (item) {
      const allowed = Array.from(
        new Set(
          [...(item.allowedUserEmails || []), ...LISTENER_EMAILS].map((e) =>
            e.trim().toLowerCase()
          )
        )
      );
      const titlePrefix =
        spec.voiceId === "terry"
          ? "Demo CGMR — Terry voice"
          : spec.voiceId === "associate_warm"
            ? "Demo CGMR — Nurturing voice"
            : "Demo CGMR — Deep resonant voice";
      await updateLibraryItem({
        id: item.id,
        title: `${titlePrefix} (${spec.email.split("@")[0]})`,
        description: item.description,
        skuCode: item.skuCode || "",
        fileName: item.fileName || "",
        categories: ["CGMR"],
        coverUrl: item.coverUrl || "",
        audioUrl: item.audioUrl,
        interestIds: item.interestIds || [],
        allowedUserEmails: allowed,
        order: item.order,
        isAdult: item.isAdult,
        inGeneralCatalog: false
      });
    }

    results.push({
      email: spec.email,
      voiceId: spec.voiceId,
      ok: true,
      libraryItemId: produced.libraryItemId,
      audioUrl: produced.audioUrl,
      voiceLabel: produced.voiceLabel
    });
  }

  const okCount = results.filter((r) => r.ok).length;
  return NextResponse.json({
    ok: okCount === DEMO_SPECS.length,
    produced: okCount,
    total: DEMO_SPECS.length,
    results,
    listenAs: "richard@visimon.app"
  });
}
