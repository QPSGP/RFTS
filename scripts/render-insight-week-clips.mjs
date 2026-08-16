/**
 * Render insight-week Clip A-C VO (Terry / shimmer) + 9:16 MP4s.
 * Usage: node --env-file=.env.local scripts/render-insight-week-clips.mjs
 */
import { spawn } from "child_process";
import { copyFileSync, mkdirSync, writeFileSync, existsSync } from "fs";
import path from "path";

const ROOT = process.cwd();
const ASSETS =
  "C:\\Users\\RichardWeatherman\\.cursor\\projects\\c-Users-RichardWeatherman-OneDrive-Weatherman-and-Company-Personal-miller-engine-CursorRFTS-rfts-platform\\assets";
const OUT = path.join(ROOT, "docs", "marketing-clips", "insight-week");
const FFMPEG =
  process.env.FFMPEG_PATH ||
  "C:\\Users\\RichardWeatherman\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0-full_build\\bin\\ffmpeg.exe";
const FFPROBE = FFMPEG.replace(/ffmpeg\.exe$/i, "ffprobe.exe");

const TERRY_INSTRUCTIONS =
  "Feminine presentation with warm signature authority - trusted Success Center guide, holistic and peaceful, never stern. " +
  "This is a short Instagram reel voiceover, not a sleep hypnosis session. " +
  "Calm, clear, unhurried conversational pace. Natural pauses between sentences. No shouty sales energy.";

const CLIPS = [
  {
    id: "clip-a",
    vo: "Self-awareness is not more self-criticism. It is clearer seeing. Press Start at bedtime. Insight grows while you sleep."
  },
  {
    id: "clip-b",
    vo: "The day already used your willpower. Rehearse follow-through at bedtime, not with another morning pep talk."
  },
  {
    id: "clip-c",
    vo: "Emotional health is steadier mood when the day catches up. Guided audios meet you at the pillow, not as another homework pile."
  }
];

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} ${args.join(" ")} failed (${code}): ${stderr.slice(-800)}`));
    });
  });
}

async function ttsToFile(text, destWav) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.LGD_OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts",
      voice: process.env.LGD_OPENAI_VOICE_TERRY?.trim() || "shimmer",
      input: text,
      response_format: "wav",
      speed: 1,
      instructions: TERRY_INSTRUCTIONS
    })
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI TTS failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(destWav, buf);
}

async function durationSeconds(file) {
  const { stdout } = await run(FFPROBE, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    file
  ]);
  const n = Number(stdout.trim());
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Could not read duration for ${file}`);
  return n;
}

async function renderClip(id, voSeconds) {
  const hook = path.join(OUT, `${id}-hook.png`);
  const mid = path.join(OUT, `${id}-mid.png`);
  const end = path.join(OUT, `${id}-end.png`);
  const wav = path.join(OUT, `${id}-vo.wav`);
  const mp4 = path.join(OUT, `${id}-hero.mp4`);
  const h = Math.max(2.4, Math.round(voSeconds * 0.28 * 100) / 100);
  const m = Math.max(3.2, Math.round(voSeconds * 0.47 * 100) / 100);
  const e = Math.max(2.2, Math.round((voSeconds - h - m) * 100) / 100);
  const scale =
    "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1,format=yuv420p";
  await run(FFMPEG, [
    "-y",
    "-loop",
    "1",
    "-t",
    String(h),
    "-i",
    hook,
    "-loop",
    "1",
    "-t",
    String(m),
    "-i",
    mid,
    "-loop",
    "1",
    "-t",
    String(e),
    "-i",
    end,
    "-i",
    wav,
    "-filter_complex",
    `[0:v]${scale}[v0];[1:v]${scale}[v1];[2:v]${scale}[v2];[v0][v1][v2]concat=n=3:v=1:a=0[v]`,
    "-map",
    "[v]",
    "-map",
    "3:a",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    "-movflags",
    "+faststart",
    mp4
  ]);
  return { mp4, h, m, e };
}

async function main() {
  if (!existsSync(FFMPEG)) throw new Error(`ffmpeg not found at ${FFMPEG}`);
  mkdirSync(OUT, { recursive: true });
  for (const clip of CLIPS) {
    for (const part of ["hook", "mid", "end"]) {
      const src = path.join(ASSETS, `${clip.id}-${part}.png`);
      const dest = path.join(OUT, `${clip.id}-${part}.png`);
      if (!existsSync(src)) throw new Error(`Missing still: ${src}`);
      copyFileSync(src, dest);
    }
  }

  for (const clip of CLIPS) {
    const wav = path.join(OUT, `${clip.id}-vo.wav`);
    console.log(`TTS ${clip.id}...`);
    await ttsToFile(clip.vo, wav);
    const dur = await durationSeconds(wav);
    console.log(`  VO ${dur.toFixed(2)}s`);
    const rendered = await renderClip(clip.id, dur);
    console.log(`  MP4 ${rendered.mp4} (h=${rendered.h} m=${rendered.m} e=${rendered.e})`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
