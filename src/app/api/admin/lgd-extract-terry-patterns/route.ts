import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { isAdminSession } from "@/lib/auth";

export const maxDuration = 300;

type SampleResult = {
  title: string;
  openingTranscript: string;
  closingTranscript: string;
  error?: string;
};

async function fetchByteRange(url: string, start: number, end: number): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { Range: `bytes=${start}-${end}` }
  });
  if (!res.ok && res.status !== 206) {
    throw new Error(`Fetch failed ${res.status} for ${url.slice(0, 80)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function fetchTail(url: string, bytes: number): Promise<Buffer> {
  const head = await fetch(url, { method: "HEAD" });
  const len = Number(head.headers.get("content-length") || 0);
  if (!Number.isFinite(len) || len <= 0) {
    // Fallback: last attempt with a large suffix range some CDNs support
    const res = await fetch(url, { headers: { Range: `bytes=-${bytes}` } });
    if (!res.ok && res.status !== 206) {
      throw new Error(`Tail fetch failed ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
  const start = Math.max(0, len - bytes);
  return fetchByteRange(url, start, len - 1);
}

async function whisperTranscript(apiKey: string, buf: Buffer, label: string): Promise<string> {
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(buf)], { type: "audio/mpeg" }),
    `${label}.mp3`
  );
  form.append("model", "whisper-1");
  form.append(
    "prompt",
    "Hypnosis induction, progressive relaxation, countdown deepening, sleep suggestions, Goal Manifestation recording by Terry Brussel-Rogers / Success Center."
  );
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Whisper ${res.status}: ${detail.slice(0, 240)}`);
  }
  const data = (await res.json()) as { text?: string };
  return (data.text || "").trim();
}

function authorized(request: Request, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  const cron = process.env.CRON_SECRET?.trim();
  if (!cron) return false;
  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${cron}`;
}

/**
 * Transcribe openings/closings of classic SC CGMR library tracks to recover
 * shared Terry induction / sleep-close language for LGD script drafts.
 */
export async function POST(request: Request) {
  const admin = await isAdminSession();
  if (!authorized(request, admin)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured." }, { status: 503 });
  }

  const { rows } = await sql<{ title: string; audio_url: string }>`
    SELECT title, audio_url
    FROM library_items
    WHERE categories @> ARRAY['CGMR']::text[]
      AND title ILIKE 'SC%CGMR%'
      AND audio_url IS NOT NULL
      AND audio_url <> ''
      AND title NOT ILIKE 'Demo%'
      AND title NOT ILIKE 'CGMR -%'
    ORDER BY
      CASE
        WHEN title ILIKE '%WEATHERMAN%' THEN 0
        WHEN title ILIKE '%WEEKS%' THEN 1
        WHEN title ILIKE '%BARRYMORE%' THEN 2
        WHEN title ILIKE '%TART%' THEN 3
        WHEN title ILIKE '%COLLINS%' THEN 4
        ELSE 9
      END,
      title
    LIMIT 4
  `;

  if (!rows.length) {
    return NextResponse.json({ error: "No SC CGMR library items found." }, { status: 404 });
  }

  // ~3–4 minutes of 128–192kbps MP3 ≈ 3–5 MB
  const OPENING_BYTES = 4_500_000;
  const CLOSING_BYTES = 3_500_000;

  const samples: SampleResult[] = [];
  for (const row of rows) {
    try {
      const openingBuf = await fetchByteRange(row.audio_url, 0, OPENING_BYTES - 1);
      const closingBuf = await fetchTail(row.audio_url, CLOSING_BYTES);
      const openingTranscript = await whisperTranscript(apiKey, openingBuf, "open");
      const closingTranscript = await whisperTranscript(apiKey, closingBuf, "close");
      samples.push({
        title: row.title,
        openingTranscript,
        closingTranscript
      });
    } catch (err) {
      samples.push({
        title: row.title,
        openingTranscript: "",
        closingTranscript: "",
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  return NextResponse.json({
    ok: samples.some((s) => s.openingTranscript),
    sampleCount: samples.length,
    samples
  });
}
