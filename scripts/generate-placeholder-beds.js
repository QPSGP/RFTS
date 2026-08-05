/**
 * Generates short soft placeholder bed WAVs for LGD (no ffmpeg required).
 * Replace with production beds from Success Center / engineer when ready.
 */
const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "..", "public", "audio", "beds");
const sampleRate = 44100;
const durationSec = 20;

function writeWav(filePath, samples) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  fs.writeFileSync(filePath, buffer);
}

function fade(i, n, fadeSamples) {
  if (i < fadeSamples) return i / fadeSamples;
  if (i > n - fadeSamples) return (n - i) / fadeSamples;
  return 1;
}

function makeBed(kind) {
  const n = sampleRate * durationSec;
  const samples = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = fade(i, n, sampleRate * 1.5) * 0.18;
    let v = 0;
    if (kind === "calm_delta") {
      v = Math.sin(2 * Math.PI * 55 * t) * 0.7 + Math.sin(2 * Math.PI * 82.5 * t) * 0.25;
      v += (Math.random() * 2 - 1) * 0.02;
    } else if (kind === "heart_coherence") {
      const pulse = 0.55 + 0.45 * Math.sin(2 * Math.PI * 0.1 * t);
      v = Math.sin(2 * Math.PI * 220 * t) * pulse * 0.55;
      v += Math.sin(2 * Math.PI * 110 * t) * 0.2;
    } else if (kind === "focus_clarity") {
      v =
        Math.sin(2 * Math.PI * 396 * t) * 0.25 +
        Math.sin(2 * Math.PI * 528 * t) * 0.2 +
        Math.sin(2 * Math.PI * 741 * t) * 0.08;
    } else if (kind === "abundance_warm") {
      v =
        Math.sin(2 * Math.PI * 174 * t) * 0.45 +
        Math.sin(2 * Math.PI * 261.6 * t) * 0.3 +
        Math.sin(2 * Math.PI * 349.2 * t) * 0.15;
    } else {
      // neutral_music - soft drone
      v =
        Math.sin(2 * Math.PI * 196 * t) * 0.35 +
        Math.sin(2 * Math.PI * 293.7 * t) * 0.28 +
        Math.sin(2 * Math.PI * 392 * t) * 0.12;
    }
    samples[i] = v * env;
  }
  return samples;
}

const beds = [
  "calm_delta",
  "heart_coherence",
  "focus_clarity",
  "abundance_warm",
  "neutral_music"
];

fs.mkdirSync(outDir, { recursive: true });
for (const id of beds) {
  const wavPath = path.join(outDir, `${id}.wav`);
  writeWav(wavPath, makeBed(id));
  // Also copy as .mp3 extension is wrong for format - write .wav and symlink-style duplicate
  // App will use .wav paths. Keep a note file.
  console.log("Wrote", wavPath);
}
console.log("Done. Placeholder beds are 20s soft tones - replace with production audio when ready.");
