import { put } from "@vercel/blob";
import {
  createLibraryItem,
  getLibraryItem,
  getLgdIntakeById,
  getMemberProfileByUserId,
  getUserById,
  linkLgdIntakeCgmrLibraryItem,
  updateLibraryItem,
  type LgdIntakeRecord
} from "@/lib/db";
import { getLgdVoiceProductionMode } from "@/lib/lgd-access";
import {
  LGD_FREQUENCY_BEDS,
  LGD_PROFESSIONAL_VOICES,
  frequencyBedAudioPath,
  normalizeLgdIntakeAnswers,
  resolveFrequencyBedId
} from "@/lib/lgd-intake";
import { getPublicSiteUrl } from "@/lib/site-url";

export type LgdCgmrProduceMode = "generate" | "assign";

export type LgdCgmrProduceResult = {
  ok: true;
  libraryItemId: string;
  audioUrl: string;
  bedPath: string | null;
  voiceLabel: string;
  bedNote: string;
  regenerated: boolean;
};

export type LgdCgmrProduceError = {
  ok: false;
  error: string;
  status: number;
};

/** Keep chunks large enough to avoid choppy joins; cut only at natural pauses. */
const OPENAI_TTS_MAX_CHARS = 3600;

/**
 * Overnight hypnotic pace. OpenAI speed is 0.25–4.0 (1.0 = conversational).
 * Slightly slower than “gentle narration” so suggestions land in a sleep state.
 */
const DEFAULT_TTS_SPEED = 0.78;

/**
 * Prefer the instruction-capable model so delivery can be steered as hypnotic
 * (smooth, continuous, sleep-inducing). Override with LGD_OPENAI_TTS_MODEL=tts-1-hd if needed.
 */
const DEFAULT_TTS_MODEL = "gpt-4o-mini-tts";

const BASE_HYPNOTIC_INSTRUCTIONS =
  "You are a professional hypnotherapist recording an overnight Goal Manifestation session. " +
  "Primary goal: induce a calm hypnotic brain state so the listener can relax into sleep and the subconscious can accept the programming. " +
  "Speak very slowly, smoothly, and continuously — never choppy, never robotic, never bright or salesy. " +
  "Warm peaceful presence. Soft natural breath pauses between phrases and longer gentle pauses between paragraphs. " +
  "Even, soothing volume. Slight downward inflection at ends of suggestions. " +
  "Sound as if sitting quietly beside someone drifting off to sleep.";

const VOICE_TONE_INSTRUCTIONS: Record<string, string> = {
  terry:
    "Feminine presentation with warm signature authority — trusted Success Center guide, holistic and peaceful, never stern.",
  associate_warm:
    "Soft nurturing feminine presentation — caring, motherly-calm, tender without baby-talk.",
  associate_clear:
    "Neutral professional presentation — clear diction at a hypnotic pace, composed and reassuring, not crisp or corporate.",
  associate_deep:
    "Masculine deeper resonant presentation — low peaceful chest resonance, grounded and sleep-deepening, never booming.",
  member_own:
    "Match the member’s natural speaking identity as closely as possible, but only in a calm peaceful hypnotic state — " +
    "as they would sound when relaxed and guiding themselves gently into sleep. Soften everyday speech; no daytime energy."
};

/** Map LGD voice catalog → OpenAI TTS voice ids (override via env). */
export function resolveOpenAiTtsVoice(voiceId: string | null | undefined): string {
  const id = (voiceId || "associate_warm").trim();
  const envKey = `LGD_OPENAI_VOICE_${id.toUpperCase()}`;
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return fromEnv;
  switch (id) {
    case "terry":
      return "shimmer";
    case "associate_clear":
      return "coral";
    case "associate_deep":
      return "onyx";
    case "associate_warm":
    case "member_own":
    default:
      return "shimmer";
  }
}

export function resolveOpenAiTtsSpeed(): number {
  const raw = process.env.LGD_OPENAI_TTS_SPEED?.trim();
  if (!raw) return DEFAULT_TTS_SPEED;
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_TTS_SPEED;
  return Math.min(4, Math.max(0.25, n));
}

function usesTtsInstructions(model: string): boolean {
  return model.toLowerCase().includes("gpt-4o-mini-tts");
}

export function buildHypnoticTtsInstructions(voiceId: string | null | undefined): string {
  const id = (voiceId || "associate_warm").trim();
  const tone = VOICE_TONE_INSTRUCTIONS[id] || VOICE_TONE_INSTRUCTIONS.associate_warm;
  return `${BASE_HYPNOTIC_INSTRUCTIONS} Tone color: ${tone}`;
}

export function resolveOpenAiTtsInstructions(
  model: string,
  voiceId?: string | null
): string | undefined {
  if (!usesTtsInstructions(model)) return undefined;
  const fromEnv = process.env.LGD_OPENAI_TTS_INSTRUCTIONS?.trim();
  if (fromEnv) return fromEnv;
  return buildHypnoticTtsInstructions(voiceId);
}

/**
 * Prepare script for continuous hypnotic speech:
 * strip markdown noise, keep paragraph pauses, avoid list choppiness.
 */
export function scriptTextForTts(raw: string): string {
  let text = raw
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*|__/g, "")
    .replace(/`+/g, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Soft paragraph breaths help models avoid rushing section joins.
  text = text
    .split(/\n\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n...\n\n");

  return text;
}

function chunkScriptForTts(text: string): string[] {
  if (text.length <= OPENAI_TTS_MAX_CHARS) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > OPENAI_TTS_MAX_CHARS) {
    const window = remaining.slice(0, OPENAI_TTS_MAX_CHARS);
    let cut = window.lastIndexOf("\n\n...\n\n");
    if (cut > OPENAI_TTS_MAX_CHARS * 0.35) {
      cut += "\n\n...\n\n".length;
    } else {
      cut = window.lastIndexOf("\n\n");
      if (cut > OPENAI_TTS_MAX_CHARS * 0.35) {
        cut += 2;
      } else {
        const sentenceCuts = [". ", "? ", "! ", "; "];
        cut = -1;
        for (const mark of sentenceCuts) {
          const idx = window.lastIndexOf(mark);
          if (idx > cut) cut = idx + mark.length;
        }
        if (cut < OPENAI_TTS_MAX_CHARS * 0.35) cut = OPENAI_TTS_MAX_CHARS;
      }
    }
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks.filter(Boolean);
}

async function synthesizeOpenAiSpeech(
  script: string,
  voice: string,
  voiceId: string | null | undefined
): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it on Vercel to generate AI voice, or assign an uploaded audio URL instead."
    );
  }
  const model = process.env.LGD_OPENAI_TTS_MODEL?.trim() || DEFAULT_TTS_MODEL;
  const speed = resolveOpenAiTtsSpeed();
  const instructions = resolveOpenAiTtsInstructions(model, voiceId);
  const prepared = scriptTextForTts(script);
  const chunks = chunkScriptForTts(prepared);
  const parts: Buffer[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const input = chunks[i];
    const continuity =
      chunks.length > 1
        ? ` This is part ${i + 1} of ${chunks.length} of one continuous overnight session — keep the same hypnotic voice, pace, and energy with no restart brightness.`
        : "";
    const body: Record<string, unknown> = {
      model,
      voice,
      input,
      response_format: "mp3",
      speed
    };
    if (instructions) body.instructions = `${instructions}${continuity}`;

    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `OpenAI TTS failed (${res.status}). ${detail.slice(0, 240) || "Check OPENAI_API_KEY and model access."}`
      );
    }
    parts.push(Buffer.from(await res.arrayBuffer()));
  }
  return Buffer.concat(parts);
}

function voiceLabel(voiceId: string | null | undefined): string {
  if (voiceId === "member_own") return "Member’s own voice (calm hypnotic state)";
  return LGD_PROFESSIONAL_VOICES.find((v) => v.id === voiceId)?.label || voiceId || "Voice TBD";
}

function bedLabel(bedId: string | null | undefined): string {
  return LGD_FREQUENCY_BEDS.find((b) => b.id === bedId)?.label || bedId || "Bed TBD";
}

function buildCgmrTitle(firstName: string | null | undefined, memberEmail: string): string {
  const name = (firstName || "").trim() || memberEmail.split("@")[0] || "Member";
  return `CGMR — ${name}`;
}

function buildCgmrDescription(input: {
  voiceLabel: string;
  bedLabel: string;
  bedPath: string | null;
  bedMixed: boolean;
}): string {
  const bedLine = input.bedPath
    ? input.bedMixed
      ? `Frequency bed: ${input.bedLabel} (mixed under voice).`
      : `Frequency bed selected: ${input.bedLabel} (${input.bedPath}). Voice track produced; bed mix can be refined in a later pass.`
    : `Frequency bed: ${input.bedLabel}.`;
  return [
    "Customized Goal Manifestation Recording for overnight hypnotic listening.",
    `Voice: ${input.voiceLabel} (calm, continuous, sleep-inducing delivery).`,
    bedLine,
    "Use 3–4 nights per week as the overview track in your night playlist."
  ].join(" ");
}

async function resolveAudioUrl(input: {
  intake: LgdIntakeRecord;
  mode: LgdCgmrProduceMode;
  audioUrl?: string | null;
  scriptOverride?: string | null;
}): Promise<{ audioUrl: string; bedNote: string }> {
  const answers = normalizeLgdIntakeAnswers(input.intake.answers);
  const voiceId = input.intake.voiceId || answers.voiceId || null;
  const productionMode = getLgdVoiceProductionMode(voiceId);
  const bedId =
    input.intake.frequencyBedId || resolveFrequencyBedId(answers) || answers.frequencyBedId || null;
  const bedPath = frequencyBedAudioPath(bedId);
  const bedNote = bedPath
    ? `Selected bed ${bedLabel(bedId)} at ${bedPath} (mix under voice when studio/AI mix is available).`
    : `Selected bed: ${bedLabel(bedId)}.`;

  if (input.mode === "assign") {
    const url = (input.audioUrl || "").trim();
    if (!url) {
      throw Object.assign(new Error("Audio URL is required to assign a CGMR."), { status: 400 });
    }
    return { audioUrl: url, bedNote };
  }

  // generate
  if (productionMode === "member_own") {
    const own = (input.intake.ownVoiceAudioUrl || "").trim();
    if (own) return { audioUrl: own, bedNote };
    throw Object.assign(
      new Error(
        "Member chose their own voice but no calm hypnotic sample is on file. Ask them to record a peaceful sample, or assign a studio audio URL."
      ),
      { status: 400 }
    );
  }

  const script = (input.scriptOverride || input.intake.scriptDraftText || "").trim();
  if (!script) {
    throw Object.assign(new Error("Script draft is empty — save a script before generating audio."), {
      status: 400
    });
  }

  const ttsVoice = resolveOpenAiTtsVoice(voiceId);
  const mp3 = await synthesizeOpenAiSpeech(script, ttsVoice, voiceId);
  const pathname = `audios/lgd-cgmr/${input.intake.id}-${Date.now()}.mp3`;
  const blob = await put(pathname, mp3, {
    access: "public",
    contentType: "audio/mpeg",
    addRandomSuffix: false
  });
  return { audioUrl: blob.url, bedNote };
}

/**
 * Produce CGMR audio (AI TTS or assigned URL) and add it to the member’s playlist
 * as a personalized CGMR library item (special-slot schedule).
 */
export async function produceLgdCgmrForIntake(input: {
  intakeId: string;
  mode: LgdCgmrProduceMode;
  audioUrl?: string | null;
  scriptOverride?: string | null;
}): Promise<LgdCgmrProduceResult | LgdCgmrProduceError> {
  const intake = await getLgdIntakeById(input.intakeId);
  if (!intake) return { ok: false, error: "Intake not found.", status: 404 };
  if (intake.status === "draft" || intake.status === "cancelled") {
    return {
      ok: false,
      error: "Submit and review the intake before producing a CGMR.",
      status: 400
    };
  }

  const user = await getUserById(intake.userId);
  if (!user?.email) return { ok: false, error: "Member account not found.", status: 404 };
  const memberEmail = user.email.trim().toLowerCase();
  const profile = await getMemberProfileByUserId(intake.userId);

  const answers = normalizeLgdIntakeAnswers(intake.answers);
  const voiceId = intake.voiceId || answers.voiceId || null;
  const bedId =
    intake.frequencyBedId || resolveFrequencyBedId(answers) || answers.frequencyBedId || null;
  const bedPath = frequencyBedAudioPath(bedId);
  const vLabel = voiceLabel(voiceId);
  const bLabel = bedLabel(bedId);

  let audioUrl: string;
  let bedNote: string;
  try {
    const resolved = await resolveAudioUrl({
      intake,
      mode: input.mode,
      audioUrl: input.audioUrl,
      scriptOverride: input.scriptOverride
    });
    audioUrl = resolved.audioUrl;
    bedNote = resolved.bedNote;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status =
      err && typeof err === "object" && "status" in err && typeof (err as { status: unknown }).status === "number"
        ? (err as { status: number }).status
        : 502;
    return { ok: false, error: message, status };
  }

  const title = buildCgmrTitle(profile?.firstName, memberEmail);
  const description = buildCgmrDescription({
    voiceLabel: vLabel,
    bedLabel: bLabel,
    bedPath,
    bedMixed: false
  });

  let libraryItemId = intake.libraryItemId || null;
  let regenerated = false;

  if (libraryItemId) {
    const existing = await getLibraryItem(libraryItemId);
    if (existing) {
      await updateLibraryItem({
        id: existing.id,
        title: existing.title || title,
        description,
        skuCode: existing.skuCode || "",
        fileName: existing.fileName || "",
        categories: existing.categories?.length ? existing.categories : ["CGMR"],
        coverUrl: existing.coverUrl || "",
        audioUrl,
        interestIds: existing.interestIds || [],
        allowedUserEmails: [memberEmail],
        order: existing.order,
        isAdult: existing.isAdult,
        inGeneralCatalog: false
      });
      regenerated = true;
    } else {
      libraryItemId = null;
    }
  }

  if (!libraryItemId) {
    const record = await createLibraryItem({
      title,
      description,
      skuCode: "",
      fileName: `lgd-cgmr-${intake.id}.mp3`,
      categories: ["CGMR"],
      coverUrl: "",
      audioUrl,
      interestIds: [],
      allowedUserEmails: [memberEmail],
      isAdult: false,
      inGeneralCatalog: false
    });
    libraryItemId = record.id;
  }

  await linkLgdIntakeCgmrLibraryItem({
    id: intake.id,
    libraryItemId,
    producedAudioUrl: audioUrl
  });

  const absoluteBed =
    bedPath && bedPath.startsWith("/") ? `${getPublicSiteUrl()}${bedPath}` : bedPath;

  return {
    ok: true,
    libraryItemId,
    audioUrl,
    bedPath: absoluteBed,
    voiceLabel: vLabel,
    bedNote,
    regenerated
  };
}

export function isOpenAiTtsConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}
