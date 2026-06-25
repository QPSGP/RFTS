import "server-only";
import fs from "fs";
import path from "path";
import { normalizeSkuCode, stripSkuHyphens } from "./sku-code";

const dataDir = path.join(process.cwd(), "data");

let descriptionsCache: Record<string, string> | null = null;

const readDescriptions = (): Record<string, string> => {
  if (descriptionsCache) return descriptionsCache;
  const filePath = path.join(dataDir, "recording-descriptions.json");
  if (!fs.existsSync(filePath)) {
    descriptionsCache = {};
    return descriptionsCache;
  }
  try {
    descriptionsCache = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, string>;
  } catch {
    descriptionsCache = {};
  }
  return descriptionsCache;
};

/** Extract T01 / S01 style codes from a file or display name. */
export const extractSkuFromName = (name: string): string | null => {
  const match = name.toUpperCase().match(/([A-Z]{1,3})[\s-]*([0-9]{1,3})([A-Z])?/);
  if (!match) return null;
  return normalizeSkuCode(match[1], match[2], match[3]);
};

/** Human-readable title from a recording file name. */
export const titleFromFileName = (name: string): string => {
  const base = name.replace(/\.[^/.]+$/, "");
  return base
    .replace(/^RFTS!?[-\s]*/i, "")
    .replace(/^[A-Z]\s*[-\s]*\d{1,3}\s*[-\s]*/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const lookupRecordingDescription = (skuCode: string): string => {
  const map = readDescriptions();
  const code = stripSkuHyphens(skuCode);
  if (!code) return "";
  if (map[code]) return map[code];
  for (const [key, value] of Object.entries(map)) {
    if (stripSkuHyphens(key) === code) return value;
  }
  const base = code.replace(/[A-Z]$/, "");
  if (base && base !== code) {
    if (map[base]) return map[base];
    for (const [key, value] of Object.entries(map)) {
      if (stripSkuHyphens(key) === base) return value;
    }
  }
  return "";
};

type BlobAssets = {
  covers?: Record<string, string>;
};

let blobAssetsCache: BlobAssets | null = null;

const readBlobAssets = (): BlobAssets => {
  if (blobAssetsCache) return blobAssetsCache;
  const filePath = path.join(dataDir, "blob-assets.json");
  if (!fs.existsSync(filePath)) {
    blobAssetsCache = {};
    return blobAssetsCache;
  }
  try {
    blobAssetsCache = JSON.parse(fs.readFileSync(filePath, "utf8")) as BlobAssets;
  } catch {
    blobAssetsCache = {};
  }
  return blobAssetsCache;
};

export const lookupCoverUrlForSku = (skuCode: string): string => {
  const code = stripSkuHyphens(skuCode);
  if (!code) return "";
  const blobAssets = readBlobAssets();
  const covers = blobAssets.covers || {};
  const base = code.replace(/[A-Z]$/, "");
  for (const file of Object.keys(covers)) {
    const match = file.toUpperCase().match(/SKU-([A-Z]{1,3})-(\d{1,3})([A-Z])?/);
    if (!match) continue;
    const fileCode = normalizeSkuCode(match[1], match[2], match[3]);
    if (fileCode === code || fileCode === base) {
      return covers[file] || "";
    }
  }
  return "";
};

export type RecordingMetadata = {
  skuCode: string | null;
  title: string;
  description: string;
  coverUrl: string;
};

export const metadataFromFileName = (fileName: string): RecordingMetadata => {
  const skuCode = extractSkuFromName(fileName);
  const title = titleFromFileName(fileName);
  const description = skuCode ? lookupRecordingDescription(skuCode) : "";
  const coverUrl = skuCode ? lookupCoverUrlForSku(skuCode) : "";
  return { skuCode, title, description, coverUrl };
};
