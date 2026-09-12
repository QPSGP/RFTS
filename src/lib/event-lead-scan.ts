import fs from "fs";
import path from "path";

const SCAN_ROOT_SEGMENTS = ["docs", "lead-card-scans"] as const;
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);

export function leadScanContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".pdf") return "application/pdf";
  return "application/octet-stream";
}

/** True when the stored path is a repo-relative scan under docs/lead-card-scans. */
export function isSafeEventLeadScanRelativePath(sourceScanPath: string | null | undefined): boolean {
  return Boolean(normalizeSafeScanRelativePath(sourceScanPath));
}

function normalizeSafeScanRelativePath(sourceScanPath: string | null | undefined): string | null {
  if (!sourceScanPath || typeof sourceScanPath !== "string") return null;
  const trimmed = sourceScanPath.trim().replace(/\\/g, "/");
  if (!trimmed || trimmed.includes("\0") || trimmed.includes("..")) return null;
  if (/^[a-zA-Z]:/.test(trimmed) || trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }
  const posix = trimmed.replace(/^\/+/, "").split("/").filter(Boolean).join("/");
  if (!posix.startsWith("docs/lead-card-scans/")) return null;
  if (posix === "docs/lead-card-scans" || posix.endsWith("/")) return null;
  const ext = path.posix.extname(posix).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return null;
  return posix;
}

function fileCandidates(absPath: string, preferPreview: boolean): string[] {
  const dir = path.dirname(absPath);
  const base = path.basename(absPath);
  const parent = path.basename(dir);
  const grand = path.dirname(dir);
  let preview: string | null = null;
  let original = absPath;
  if (parent === "jpg") {
    preview = path.join(grand, "preview", base);
  } else if (parent === "preview") {
    preview = absPath;
    original = path.join(grand, "jpg", base);
  }
  const ordered = preferPreview && preview ? [preview, original] : [original, preview];
  return [...new Set(ordered.filter((p): p is string => Boolean(p)))];
}

function posixBlobCandidates(relative: string, preferPreview: boolean): string[] {
  const blobRel = relative.replace(/^docs\//, "");
  const parts = blobRel.split("/").filter(Boolean);
  const file = parts[parts.length - 1] || "";
  const parent = parts.length >= 2 ? parts[parts.length - 2] : "";
  const folder = parts.slice(0, -2).join("/");
  const out: string[] = [];
  const push = (value: string) => {
    if (value && !out.includes(value)) out.push(value);
  };

  if (parent === "jpg" || parent === "preview") {
    const preview = `${folder}/preview/${file}`;
    const original = `${folder}/jpg/${file}`;
    if (preferPreview) {
      push(preview);
      push(original);
    } else {
      push(original);
      push(preview);
    }
    return out;
  }

  push(blobRel);
  const match = file.match(/^(\d{8}_\d{6})(?:-\d+)?\.([a-z0-9]+)$/i);
  if (match) {
    const base = `${match[1]}.${match[2]}`;
    const preview = `lead-card-scans/long-beach-2026-08/preview/${base}`;
    const original = `lead-card-scans/long-beach-2026-08/jpg/${base}`;
    if (preferPreview) {
      push(preview);
      push(original);
    } else {
      push(original);
      push(preview);
    }
  }
  return out;
}

/** Blob pathnames for a stored sourceScanPath (docs/ prefix stripped). */
export function leadScanBlobPathnames(
  sourceScanPath: string | null | undefined,
  options?: { preferPreview?: boolean }
): string[] {
  const relative = normalizeSafeScanRelativePath(sourceScanPath);
  if (!relative) return [];
  return posixBlobCandidates(relative, Boolean(options?.preferPreview));
}

/**
 * Resolve a stored sourceScanPath to a file under docs/lead-card-scans.
 * Returns null on traversal, missing files, or disallowed types.
 */
export function resolveEventLeadScanFile(
  sourceScanPath: string | null | undefined,
  options?: { preferPreview?: boolean }
): string | null {
  const relative = normalizeSafeScanRelativePath(sourceScanPath);
  if (!relative) return null;

  const cwd = process.cwd();
  const root = path.resolve(cwd, ...SCAN_ROOT_SEGMENTS);
  const abs = path.resolve(cwd, ...relative.split("/"));
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;

  const preferPreview = Boolean(options?.preferPreview);
  for (const candidate of fileCandidates(abs, preferPreview)) {
    if (candidate !== root && !candidate.startsWith(root + path.sep)) continue;
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      continue;
    }
  }
  return null;
}
