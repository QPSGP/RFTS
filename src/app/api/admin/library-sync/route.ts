import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { listLibrary, updateLibraryItem } from "@/lib/db";

type BlobAssets = {
  audios?: Record<string, string>;
  covers?: Record<string, string>;
};

const dataDir = path.join(process.cwd(), "data");

const readJson = <T>(fileName: string, fallback: T): T => {
  const filePath = path.join(dataDir, fileName);
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw) {
    return fallback;
  }
  return JSON.parse(raw) as T;
};

const normalizeCode = (prefix: string, number: string, suffix?: string) => {
  const padded = number.length === 1 ? number.padStart(2, "0") : number;
  return `${prefix.toUpperCase()}-${padded}${suffix ? `-${suffix.toUpperCase()}` : ""}`;
};

const extractCode = (name: string) => {
  const match = name
    .toUpperCase()
    .match(/([A-Z]{1,3})[\s-]*([0-9]{1,3})([A-Z])?/);
  if (!match) {
    return null;
  }
  return normalizeCode(match[1], match[2], match[3]);
};

const cleanTitle = (name: string) => {
  const base = name.replace(/\.[^/.]+$/, "");
  return base
    .replace(/^RFTS!?[-\s]*/i, "")
    .replace(/^[A-Z]\s*[-\s]*\d{1,3}\s*[-\s]*/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const getFileNameFromUrl = (url: string) => {
  if (!url) return "";
  try {
    const parsed = new URL(url, "http://localhost");
    const fileParam = parsed.searchParams.get("file");
    if (fileParam) {
      return fileParam;
    }
    const last = parsed.pathname.split("/").pop() || "";
    return decodeURIComponent(last);
  } catch {
    const last = url.split("/").pop() || "";
    try {
      return decodeURIComponent(last);
    } catch {
      return last;
    }
  }
};

const buildCoverMap = (blobAssets: BlobAssets) => {
  const coverMap = new Map<string, string>();
  Object.keys(blobAssets.covers || {}).forEach((file) => {
    const match = file.toUpperCase().match(/SKU-([A-Z]{1,3})-(\d{1,3})([A-Z])?/);
    if (match) {
      const code = normalizeCode(match[1], match[2], match[3]);
      if (!coverMap.has(code)) {
        coverMap.set(code, file);
      }
    }
  });
  return coverMap;
};

export async function POST() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const blobAssets = readJson<BlobAssets>("blob-assets.json", {});
  const descriptionMap = readJson<Record<string, string>>(
    "recording-descriptions.json",
    {}
  );
  const coverMap = buildCoverMap(blobAssets);
  const audioFiles = Object.keys(blobAssets.audios || {});
  const titleToAudio = new Map<string, string>();
  audioFiles.forEach((file) => {
    titleToAudio.set(cleanTitle(file).toLowerCase(), file);
  });

  const library = await listLibrary();
  let updated = 0;
  let skipped = 0;

  for (const item of library) {
    const fileName =
      getFileNameFromUrl(item.audioUrl) ||
      getFileNameFromUrl(item.coverUrl) ||
      titleToAudio.get(item.title.toLowerCase()) ||
      "";
    const code = fileName ? extractCode(fileName) : null;
    if (!code) {
      skipped += 1;
      continue;
    }
    const baseCode = code.replace(/-[A-Z]+$/, "");
    const description =
      descriptionMap[code] || (baseCode ? descriptionMap[baseCode] || "" : "");

    const coverFile = coverMap.get(code) || coverMap.get(baseCode);
    const coverUrl = coverFile ? blobAssets.covers?.[coverFile] || "" : "";
    const audioUrl = blobAssets.audios?.[fileName] || item.audioUrl || "";

    const nextDescription = item.description || description || "";
    const nextCoverUrl = item.coverUrl || coverUrl || "";
    const nextAudioUrl = item.audioUrl || audioUrl || "";

    if (
      nextDescription === item.description &&
      nextCoverUrl === item.coverUrl &&
      nextAudioUrl === item.audioUrl
    ) {
      skipped += 1;
      continue;
    }

    await updateLibraryItem({
      id: item.id,
      title: item.title,
      description: nextDescription,
      skuCode: item.skuCode || "",
      categories: item.categories || [],
      coverUrl: nextCoverUrl,
      audioUrl: nextAudioUrl,
      interestIds: item.interestIds,
      allowedUserEmails: item.allowedUserEmails || [],
      order: item.order,
      isAdult: item.isAdult
    });
    updated += 1;
  }

  return NextResponse.json({ updated, skipped });
}
