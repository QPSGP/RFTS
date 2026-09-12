/**
 * Upload Expo lead-card JPEGs to Vercel Blob so production admin can
 * open the original scan. Files stay gitignored; only Blob stores the bytes.
 * The admin scan API still requires login and does not expose the Blob URL.
 *
 * Usage (from rfts-platform, with BLOB_READ_WRITE_TOKEN in .env.local):
 *   npm run upload:lead-scans
 *   npm run upload:lead-scans -- --preview-only
 */
import fs from "fs";
import path from "path";
import { config } from "dotenv";
import { put } from "@vercel/blob";

config({ path: ".env.local" });

const ROOT = path.join("docs", "lead-card-scans");
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const CONCURRENCY = 4;

function walkImages(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkImages(full, files);
      continue;
    }
    if (IMAGE_EXT.test(entry.name)) files.push(full);
  }
  return files;
}

async function runPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index++];
      await fn(current);
    }
  });
  await Promise.all(workers);
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    console.error("BLOB_READ_WRITE_TOKEN missing in .env.local");
    process.exit(1);
  }

  const previewOnly = process.argv.includes("--preview-only");
  const all = walkImages(ROOT).filter((file) => {
    const posix = file.replace(/\\/g, "/");
    if (previewOnly) return posix.includes("/preview/");
    return posix.includes("/jpg/") || posix.includes("/preview/");
  });

  if (all.length === 0) {
    console.error(`No scan JPEGs found under ${ROOT}`);
    process.exit(1);
  }

  console.log(`Uploading ${all.length} scan files to Blob...`);
  let ok = 0;
  let failed = 0;

  await runPool(all, CONCURRENCY, async (file) => {
    const relative = path.relative(process.cwd(), file).replace(/\\/g, "/");
    const pathname = relative.replace(/^docs\//, "");
    try {
      const body = fs.readFileSync(file);
      await put(pathname, body, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: file.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
        cacheControlMaxAge: 60 * 60 * 24 * 30
      });
      ok += 1;
      console.log(`ok ${pathname}`);
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`fail ${pathname}: ${message}`);
    }
  });

  console.log(`Done. uploaded=${ok} failed=${failed}`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
