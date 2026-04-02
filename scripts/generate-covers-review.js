/**
 * Generate square SVG "album" covers for library items with no coverUrl.
 * Outputs to public/covers-review/ — NOT wired into library; for admin review only.
 *
 * Usage: node scripts/generate-covers-review.js
 */
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const libraryPath = path.join(root, "data", "library.json");
const descriptionsPath = path.join(root, "data", "recording-descriptions.json");
const outDir = path.join(root, "public", "covers-review");

/** When filename has no T/S/P code, map track id → SKU for description lookup */
const SKU_BY_ID = {
  "track-4": "T-20"
};

/** When there is no SKU description, use this review copy (keeps covers meaningful). */
const BLURB_BY_ID = {
  "track-1":
    "Gentle guided support for peace and serenity while honoring a beloved companion who has passed.",
  "track-2": "Interval and transition music for structured meditation sessions (ramp in / ramp out).",
  "track-3":
    "Emotional recovery and resilience after fires, natural disasters, and other high-stress events.",
  "track-48":
    "Harmony with your children — compassionate support for healthier family patterns and connection.",
  "track-54":
    "Stop smoking and build positive stress management — calm body, clear mind, healthier habits.",
  "track-55": "Opening / starting music for Reach For The Stars guided meditation sessions."
};

function decodeFileParam(audioUrl) {
  try {
    const u = new URL(audioUrl, "http://local");
    const f = u.searchParams.get("file");
    return f ? decodeURIComponent(f) : "";
  } catch {
    return "";
  }
}

function extractSku(fileName, title) {
  const s = `${fileName} ${title}`.toUpperCase();
  const m = s.match(/\b([TSP])[\s-]*(\d{1,3})([A-Z])?\b/);
  if (!m) return null;
  const num = m[2].padStart(2, "0");
  return m[3] ? `${m[1]}-${num}-${m[3]}` : `${m[1]}-${num}`;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanTitle(t) {
  return String(t)
    .replace(/\bRFTS!?/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s-]+|[\s-]+$/g, "")
    .trim();
}

function wrapLines(text, maxChars, maxLines) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length >= maxLines) break;
    } else {
      cur = next;
    }
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  return lines.slice(0, maxLines);
}

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function buildSvg({ title, sku, bodyLines, isAdult }) {
  const W = 600;
  const H = 600;
  const titleLines = wrapLines(cleanTitle(title), 26, 3);
  const body = isAdult
    ? ["Private wellness session · Mature audiences", "Reach For The Stars Meditation"]
    : bodyLines.length
      ? bodyLines
      : ["Guided meditation · Reach For The Stars"];

  let y = 120;
  const titleTspans = titleLines
    .map((line, i) => {
      const yy = y + i * 34;
      return `<tspan x="300" y="${yy}" text-anchor="middle">${escapeXml(line)}</tspan>`;
    })
    .join("");

  y = 230;
  const bodyTspans = body
    .map((line, i) => {
      const yy = y + i * 26;
      return `<tspan x="300" y="${yy}" text-anchor="middle">${escapeXml(line)}</tspan>`;
    })
    .join("");

  const skuText = sku ? escapeXml(sku) : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f766e"/>
      <stop offset="55%" style="stop-color:#115e59"/>
      <stop offset="100%" style="stop-color:#042f2e"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#d1fae5;stop-opacity:0.35"/>
      <stop offset="100%" style="stop-color:#d1fae5;stop-opacity:0"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="0" y="420" width="600" height="180" fill="url(#accent)"/>
  <circle cx="300" cy="88" r="36" fill="none" stroke="#99f6e4" stroke-width="2" opacity="0.5"/>
  <path d="M288 70v40c0 6-5 11-11 11s-11-5-11-11 5-11 11-11c1 0 3 0 4 1V58h32v22h-10V70h-16z" fill="#99f6e4" opacity="0.45"/>
  ${skuText ? `<text x="560" y="42" text-anchor="end" fill="#a7f3d0" font-family="Georgia, 'Times New Roman', serif" font-size="15" font-weight="600">${skuText}</text>` : ""}
  <text fill="#ecfdf5" font-family="Georgia, 'Times New Roman', serif" font-size="26" font-weight="700">${titleTspans}</text>
  <text fill="#d1fae5" font-family="system-ui, Segoe UI, sans-serif" font-size="15" opacity="0.92">${bodyTspans}</text>
  <text x="300" y="556" text-anchor="middle" fill="#5eead4" font-family="system-ui, sans-serif" font-size="11" letter-spacing="0.2em" font-weight="600">REACH FOR THE STARS</text>
  <text x="300" y="578" text-anchor="middle" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="10">Review draft — not in production library</text>
</svg>`;
}

function main() {
  const library = JSON.parse(fs.readFileSync(libraryPath, "utf8"));
  const descriptions = JSON.parse(fs.readFileSync(descriptionsPath, "utf8"));

  fs.mkdirSync(outDir, { recursive: true });

  const manifest = [];
  const missing = library.filter((item) => !String(item.coverUrl || "").trim());

  for (const item of missing) {
    const fileName = decodeFileParam(item.audioUrl || "");
    let sku = SKU_BY_ID[item.id] || extractSku(fileName, item.title || "");
    let rawDesc = String(item.description || "").trim();
    let descSource = item.description ? "library.json" : "";
    if (!rawDesc && sku && descriptions[sku]) {
      rawDesc = descriptions[sku];
      descSource = `recording-descriptions.json (${sku})`;
    }
    if (!rawDesc && sku) {
      const base = sku.replace(/-[A-Z]$/, "");
      if (base !== sku && descriptions[base]) {
        rawDesc = descriptions[base];
        descSource = `recording-descriptions.json (${base})`;
      }
    }
    if (!rawDesc && BLURB_BY_ID[item.id]) {
      rawDesc = BLURB_BY_ID[item.id];
      descSource = "generate-covers-review.js (curated blurb)";
    }
    if (!rawDesc) {
      rawDesc = cleanTitle(item.title) || "Guided meditation session.";
      descSource = descSource || "title/fallback";
    }

    const firstSentence = rawDesc.match(/^.{1,280}?(?:[.!?](?=\s|$)|$)/);
    const headline = (firstSentence && firstSentence[0].trim()) || rawDesc;
    const excerpt = headline.length > 220 ? `${headline.slice(0, 217)}…` : headline;
    const bodyLines = wrapLines(excerpt, 44, 5);

    const isAdult = !!item.isAdult;
    const svg = buildSvg({
      title: item.title,
      sku,
      bodyLines,
      isAdult
    });

    const fileBase = `${item.id}-${slug(item.title)}`;
    const outFile = `${fileBase}.svg`;
    const outPath = path.join(outDir, outFile);
    fs.writeFileSync(outPath, svg, "utf8");

    manifest.push({
      libraryJsonId: item.id,
      title: item.title,
      skuGuess: sku,
      descriptionSource: descSource,
      fileName: outFile,
      /** Use with dev server: e.g. http://localhost:3000/covers-review/… */
      publicUrl: `/covers-review/${outFile}`,
      isAdult
    });
  }

  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify({ generatedAt: new Date().toISOString(), count: manifest.length, items: manifest }, null, 2));

  const rows = manifest
    .map((m) => {
      const rel = `./${m.fileName}`;
      return `<tr><td><img src="${rel}" width="120" height="120" alt="" style="object-fit:cover;border-radius:8px;border:1px solid #e5e7eb"/></td><td><code>${escapeHtml(m.libraryJsonId)}</code></td><td>${escapeHtml(m.title)}</td><td>${escapeHtml(m.skuGuess || "—")}</td><td>${escapeHtml(m.descriptionSource)}</td><td><a href="${rel}">SVG</a></td></tr>`;
    })
    .join("\n");

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Cover review — Reach For The Stars</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1100px; margin: 24px auto; padding: 0 16px; color: #0f172a; }
    h1 { font-size: 1.35rem; }
    p.note { color: #64748b; font-size: 0.95rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
    th { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; }
  </style>
</head>
<body>
  <h1>Generated cover drafts (review only)</h1>
  <p class="note">These files are <strong>not</strong> linked from the app or database. After you approve, upload PNG/SVG to Blob (or paste URL in Admin → library) and set <strong>Cover URL</strong> per item. Regenerate with <code>npm run covers:review</code> after updating <code>data/library.json</code> or descriptions.</p>
  <p class="note">You can open this <code>index.html</code> directly from the folder (double-click) — previews use <strong>relative</strong> paths so images work. Or use the dev server: <code>http://localhost:3000/covers-review/index.html</code></p>
  <table>
    <thead><tr><th>Preview</th><th>ID</th><th>Title</th><th>SKU</th><th>Description source</th><th>File</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

  fs.writeFileSync(path.join(outDir, "index.html"), indexHtml, "utf8");

  console.log(`Wrote ${manifest.length} SVG(s) and manifest to ${path.relative(root, outDir)}`);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

main();
