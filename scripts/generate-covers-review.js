/**
 * Generate square SVG "album" covers for library items with no coverUrl.
 * Outputs to public/covers-review/ - NOT wired into library; for admin review only.
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
    "Harmony with your children - compassionate support for healthier family patterns and connection.",
  "track-54":
    "Stop smoking and build positive stress management - calm body, clear mind, healthier habits.",
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

/** Pick a visual metaphor from title + full description text. */
function pickVisualTheme({ title, rawDesc, isAdult }) {
  const t = `${title} ${rawDesc}`.toLowerCase();
  if (isAdult) return "abstract-warm";
  if (/pet|beloved|companion|passing|serenity|animal/.test(t)) return "gentle-memorial";
  if (/interval|starting music|ramp|2hr/.test(t)) return "sound-flow";
  if (/fire|disaster|natural/.test(t)) return "horizon-calm";
  if (/abundance|money|magnet|associate/.test(t)) return "radiance";
  if (/from stress to success|stress to success/.test(t)) return "path-up";
  if (/harmony|children|breaking/.test(t)) return "connection";
  if (/hair growth|hair/.test(t)) return "growth-flow";
  if (/drinking|alcohol|sober|stop drinking/.test(t)) return "new-dawn";
  if (/smoking|smoke/.test(t)) return "clear-breath";
  if (/health|rejuvenation|physical balance/.test(t)) return "life-rhythm";
  return "starglow";
}

/**
 * Large decorative vector layer (not a photo - SVG shapes) suggesting the session theme.
 * Placed behind text; readability handled by fade overlay.
 */
function renderThemedBackground(theme) {
  const mint = "#99f6e4";
  const aqua = "#5eead4";
  const deep = "#134e4a";
  const g = (inner) => `<g opacity="0.5" fill="none" stroke="${mint}" stroke-width="1.5">${inner}</g>`;

  switch (theme) {
    case "gentle-memorial":
      return `<g opacity="0.45">
        <path fill="${aqua}" fill-opacity="0.12" stroke="none" d="M300 520 C220 440 160 360 200 300 C220 260 270 270 300 310 C330 270 380 260 400 300 C440 360 380 440 300 520Z"/>
        <path fill="none" stroke="${mint}" stroke-width="2" d="M140 180l-8 24 22-16h-28l22 16z"/>
        <ellipse cx="460" cy="200" rx="70" ry="90" fill="${deep}" fill-opacity="0.35" stroke="${mint}" stroke-width="1.5" transform="rotate(-12 460 200)"/>
        <path fill="${aqua}" fill-opacity="0.15" stroke="none" d="M80 340 Q120 300 100 260 Q140 280 160 240 Q180 300 140 340 Q100 360 80 340"/>
      </g>`;
    case "sound-flow":
      return `<g opacity="0.5">
        ${[0, 1, 2, 3, 4, 5, 6, 7]
          .map(
            (i) =>
              `<rect x="${60 + i * 55}" y="${320 - (i % 5) * 28 - 40}" width="28" height="${80 + (i * 12) % 100}" rx="6" fill="${aqua}" fill-opacity="0.2" stroke="${mint}" stroke-width="1"/>`
          )
          .join("")}
        <path fill="none" stroke="${mint}" stroke-width="2" opacity="0.7" d="M40 480 Q150 400 300 420 T560 380"/>
        <path fill="none" stroke="${aqua}" stroke-width="1.5" opacity="0.5" d="M40 500 Q200 440 300 460 T560 420"/>
      </g>`;
    case "horizon-calm":
      return `<g opacity="0.5">
        <circle cx="300" cy="520" r="120" fill="#fbbf24" fill-opacity="0.12" stroke="${mint}" stroke-width="2"/>
        <path fill="${deep}" fill-opacity="0.5" stroke="none" d="M0 380 L120 340 L200 360 L300 320 L420 350 L520 330 L600 360 L600 600 L0 600Z"/>
        <path fill="none" stroke="${mint}" stroke-width="2" d="M0 400 Q300 360 600 395"/>
      </g>`;
    case "radiance":
      return `<g opacity="0.45">
        ${Array.from({ length: 14 }, (_, i) => {
          const a = (i * Math.PI * 2) / 14;
          const x2 = 300 + Math.cos(a) * 220;
          const y2 = 300 + Math.sin(a) * 220;
          return `<line x1="300" y1="380" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}" stroke="${mint}" stroke-width="2" opacity="0.6"/>`;
        }).join("")}
        <circle cx="300" cy="380" r="48" fill="${aqua}" fill-opacity="0.2" stroke="${mint}" stroke-width="2"/>
        <circle cx="300" cy="380" r="22" fill="#fef3c7" fill-opacity="0.15" stroke="none"/>
      </g>`;
    case "path-up":
      return `<g opacity="0.5">
        <path fill="none" stroke="${aqua}" stroke-width="4" stroke-linecap="round" d="M120 520 Q180 420 200 360 Q240 280 280 240 Q320 200 300 160"/>
        ${[0, 1, 2, 3].map(
          (i) =>
            `<circle cx="${140 + i * 90}" cy="${480 - i * 70}" r="14" fill="${aqua}" fill-opacity="0.18" stroke="${mint}" stroke-width="1.5"/>`
        ).join("")}
        <path fill="none" stroke="${mint}" stroke-width="1.5" opacity="0.6" d="M280 140 L300 110 L320 140"/>
      </g>`;
    case "connection":
      return `<g opacity="0.5">
        <circle cx="200" cy="400" r="55" fill="${aqua}" fill-opacity="0.12" stroke="${mint}" stroke-width="2"/>
        <circle cx="400" cy="400" r="55" fill="${aqua}" fill-opacity="0.12" stroke="${mint}" stroke-width="2"/>
        <circle cx="300" cy="280" r="55" fill="${aqua}" fill-opacity="0.15" stroke="${mint}" stroke-width="2"/>
        <path fill="none" stroke="${mint}" stroke-width="2" d="M248 360 Q300 320 352 360 M300 335 L300 400"/>
      </g>`;
    case "growth-flow":
      return `<g opacity="0.45">
        ${[-80, -40, 0, 40, 80].map(
          (dx, i) =>
            `<path fill="none" stroke="${i % 2 ? aqua : mint}" stroke-width="2.5" opacity="0.7" d="M${300 + dx} 560 Q${280 + dx} 400 ${300 + dx * 0.3} 220 Q${320 + dx} 140 300 80"/>`
        ).join("")}
        <ellipse cx="300" cy="70" rx="40" ry="16" fill="${aqua}" fill-opacity="0.2" stroke="none"/>
      </g>`;
    case "new-dawn":
      return `<g opacity="0.5">
        <path fill="#fbbf24" fill-opacity="0.18" stroke="none" d="M0 520 A300 200 0 0 1 600 520 L600 600 L0 600Z"/>
        ${[0, 1, 2, 3, 4].map(
          (i) =>
            `<path fill="none" stroke="${mint}" stroke-width="1.2" opacity="0.5" d="M${50 + i * 120} 500 Q${110 + i * 120} 480 ${170 + i * 120} 500"/>`
        ).join("")}
        <circle cx="300" cy="520" r="90" fill="#fef3c7" fill-opacity="0.08" stroke="${mint}" stroke-width="2"/>
      </g>`;
    case "clear-breath":
      return `<g opacity="0.5">
        <path fill="none" stroke="${aqua}" stroke-width="2" d="M300 520 C220 480 180 400 200 320 C220 260 280 240 300 280 C320 240 380 260 400 320 C420 400 380 480 300 520"/>
        ${[0, 1, 2, 3, 4].map(
          (i) =>
            `<path fill="none" stroke="${mint}" stroke-width="1.5" opacity="0.6" d="M${120 + i * 90} 200 Q${150 + i * 90} 160 ${180 + i * 90} 200"/>`
        ).join("")}
      </g>`;
    case "life-rhythm":
      return g(
        `<path d="M40 400 L80 400 L100 340 L130 460 L160 320 L190 440 L220 360 L250 420 L280 380 L310 430 L340 350 L370 410 L400 370 L430 400 L560 400" stroke="${aqua}" stroke-width="3" fill="none" stroke-linejoin="round"/>`
      );
    case "abstract-warm":
      return `<g opacity="0.4">
        <ellipse cx="380" cy="320" rx="140" ry="180" fill="#fda4af" fill-opacity="0.14" stroke="#fda4af" stroke-width="1" transform="rotate(-25 380 320)"/>
        <ellipse cx="200" cy="420" rx="100" ry="130" fill="${aqua}" fill-opacity="0.1" stroke="${mint}" transform="rotate(15 200 420)"/>
        <circle cx="300" cy="260" r="90" fill="none" stroke="${mint}" stroke-width="1.5" opacity="0.5"/>
      </g>`;
    case "starglow":
    default:
      return `<g opacity="0.55" fill="${mint}">
        ${Array.from({ length: 28 }, (_, i) => {
          const x = 40 + (i * 73) % 520;
          const y = 200 + (i * 97) % 320;
          const r = 1.5 + (i % 4);
          return `<circle cx="${x}" cy="${y}" r="${r}" opacity="0.35"/>`;
        }).join("")}
        <path fill="none" stroke="${aqua}" stroke-width="1.2" opacity="0.45" d="M120 280 L140 320 L180 300 L160 340 L200 360 L150 370 L130 400"/>
        <path fill="none" stroke="${aqua}" stroke-width="1.2" opacity="0.35" d="M400 240 L430 280 L470 250 L450 300"/>
      </g>`;
  }
}

function buildSvg({ title, sku, bodyLines, isAdult, rawDescForTheme }) {
  const W = 600;
  const H = 600;
  const theme = pickVisualTheme({
    title,
    rawDesc: rawDescForTheme || "",
    isAdult
  });
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
  const themedBg = renderThemedBackground(theme);

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
    <linearGradient id="textFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" style="stop-color:#042f2e;stop-opacity:0.92"/>
      <stop offset="42%" style="stop-color:#042f2e;stop-opacity:0.55"/>
      <stop offset="72%" style="stop-color:#042f2e;stop-opacity:0.2"/>
      <stop offset="100%" style="stop-color:#042f2e;stop-opacity:0"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  ${themedBg}
  <rect x="0" y="0" width="600" height="340" fill="url(#textFade)"/>
  <rect x="0" y="420" width="600" height="180" fill="url(#accent)"/>
  <circle cx="300" cy="88" r="36" fill="none" stroke="#99f6e4" stroke-width="2" opacity="0.5"/>
  <path d="M288 70v40c0 6-5 11-11 11s-11-5-11-11 5-11 11-11c1 0 3 0 4 1V58h32v22h-10V70h-16z" fill="#99f6e4" opacity="0.45"/>
  ${skuText ? `<text x="560" y="42" text-anchor="end" fill="#a7f3d0" font-family="Georgia, 'Times New Roman', serif" font-size="15" font-weight="600">${skuText}</text>` : ""}
  <text fill="#ecfdf5" font-family="Georgia, 'Times New Roman', serif" font-size="26" font-weight="700">${titleTspans}</text>
  <text fill="#d1fae5" font-family="system-ui, Segoe UI, sans-serif" font-size="15" opacity="0.92">${bodyTspans}</text>
  <text x="300" y="556" text-anchor="middle" fill="#5eead4" font-family="system-ui, sans-serif" font-size="11" letter-spacing="0.2em" font-weight="600">REACH FOR THE STARS</text>
  <text x="300" y="578" text-anchor="middle" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="10">Review draft - not in production library</text>
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
    const visualTheme = pickVisualTheme({
      title: item.title,
      rawDesc,
      isAdult
    });
    const svg = buildSvg({
      title: item.title,
      sku,
      bodyLines,
      isAdult,
      rawDescForTheme: rawDesc
    });

    const fileBase = `${item.id}-${slug(item.title)}`;
    const outFile = `${fileBase}.svg`;
    const outPath = path.join(outDir, outFile);
    fs.writeFileSync(outPath, svg, "utf8");

    manifest.push({
      libraryJsonId: item.id,
      title: item.title,
      skuGuess: sku,
      visualTheme,
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
      return `<tr><td><img src="${rel}" width="120" height="120" alt="" style="object-fit:cover;border-radius:8px;border:1px solid #e5e7eb"/></td><td><code>${escapeHtml(m.libraryJsonId)}</code></td><td>${escapeHtml(m.title)}</td><td>${escapeHtml(m.skuGuess || "-")}</td><td><code>${escapeHtml(m.visualTheme || "")}</code></td><td>${escapeHtml(m.descriptionSource)}</td><td><a href="${rel}">SVG</a></td></tr>`;
    })
    .join("\n");

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Cover review - Reach For The Stars</title>
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
  <p class="note">You can open this <code>index.html</code> directly from the folder (double-click) - previews use <strong>relative</strong> paths so images work. Or use the dev server: <code>http://localhost:3000/covers-review/index.html</code></p>
  <p class="note">Background art is <strong>SVG illustration</strong> (shapes, gradients) chosen from title + description - not stock photos. Edit themes in <code>scripts/generate-covers-review.js</code> (<code>pickVisualTheme</code> / <code>renderThemedBackground</code>).</p>
  <table>
    <thead><tr><th>Preview</th><th>ID</th><th>Title</th><th>SKU</th><th>Visual theme</th><th>Description source</th><th>File</th></tr></thead>
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
