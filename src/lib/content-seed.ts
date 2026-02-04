import fs from "fs";
import path from "path";
import type { Interest, PlaybackSettings, SubscriptionPlan } from "@/lib/types";

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

export const defaultInterests: Interest[] = [
  { id: "accepting-loss-of-love-partner", name: "Accepting Loss of Love Partner", createdAt: "2023-11-14T21:48:39.000Z" },
  { id: "phobias-control", name: "Phobia(s) Control", createdAt: "2020-08-13T17:39:54.000Z" },
  { id: "physical-balance", name: "Physical Balance", createdAt: "2023-11-14T21:47:56.000Z" },
  { id: "psychic-abilities", name: "Psychic Abilities", createdAt: "2020-08-13T17:39:54.000Z" },
  { id: "public-speaking", name: "Public Speaking", createdAt: "2020-08-13T17:39:54.000Z" },
  { id: "relationship-joy", name: "Relationship Joy", createdAt: "2020-08-13T17:39:54.000Z" },
  { id: "release-jealousy-monogamous", name: "Release Jealousy-Monogamous", createdAt: "2020-08-13T17:39:54.000Z" },
  { id: "sales-skills", name: "Sales Skills", createdAt: "2020-08-13T17:39:54.000Z" },
  { id: "saving-money", name: "Saving Money", createdAt: "2020-08-13T17:39:54.000Z" },
  { id: "sleep-well", name: "Sleep Well", createdAt: "2020-08-13T17:39:54.000Z" },
  { id: "speed-reading", name: "Speed Reading", createdAt: "2020-08-13T17:39:54.000Z" },
  { id: "spiritual-growth", name: "Spiritual Growth", createdAt: "2020-08-13T17:39:54.000Z" },
  { id: "stop-drinking", name: "Stop Drinking", createdAt: "2020-08-13T17:39:54.000Z" },
  { id: "stop-smoking", name: "Stop Smoking", createdAt: "2020-08-13T17:39:54.000Z" },
  { id: "stress-management", name: "Stress Management", createdAt: "2020-08-13T17:39:54.000Z" },
  { id: "test-taking", name: "Test Taking", createdAt: "2020-08-13T17:39:54.000Z" },
  { id: "time-management", name: "Time Management", createdAt: "2020-08-13T17:39:54.000Z" },
  { id: "weight-control", name: "Weight Control", createdAt: "2020-08-13T17:39:54.000Z" }
];

export const defaultSubscriptionPlans: SubscriptionPlan[] = [
  {
    id: "platinum",
    name: "Membership Package",
    priceId: "",
    trialDays: 14,
    description: "Full library access with goal-based scheduling."
  }
];

export const defaultPlaybackSettings: PlaybackSettings = {
  playsPerRecording: 21,
  nightlyGapHours: 2.5,
  addNewTrackEveryNights: 7,
  initialTracks: 3,
  cgmrTrackId: "",
  fallbackTrackId: "T-18"
};

type BlobAssets = {
  audios?: Record<string, string>;
  covers?: Record<string, string>;
};

type LibrarySeedItem = {
  title: string;
  description: string;
  skuCode?: string;
  categories?: string[];
  coverUrl: string;
  audioUrl: string;
  interestIds: string[];
  allowedUserEmails: string[];
  order: number;
  isAdult: boolean;
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

const isAdultContent = (name: string) => {
  const upper = name.toUpperCase();
  return (
    upper.includes("MATURE CONTENT") ||
    upper.includes("EROTICA") ||
    upper.includes("ORGASM") ||
    upper.includes("SEXUAL")
  );
};

export const buildLibrarySeedFromAssets = (): LibrarySeedItem[] => {
  const blobAssets = readJson<BlobAssets>("blob-assets.json", {});
  const descriptionMap = readJson<Record<string, string>>(
    "recording-descriptions.json",
    {}
  );
  const audioFiles = Object.keys(blobAssets.audios || {});
  const coverFiles = Object.keys(blobAssets.covers || {});

  const coverMap = new Map<string, string>();
  coverFiles.forEach((file) => {
    const upper = file.toUpperCase();
    const match = upper.match(/SKU-([A-Z]{1,3})-(\d{1,3})([A-Z])?/);
    if (match) {
      const code = normalizeCode(match[1], match[2], match[3]);
      if (!coverMap.has(code)) {
        coverMap.set(code, file);
      }
    }
  });

  return audioFiles.map((file, index) => {
    const code = extractCode(file);
    const coverFile = code ? coverMap.get(code) : undefined;
    const baseCode = code ? code.replace(/-[A-Z]+$/, "") : null;
    const description = code
      ? descriptionMap[code] || (baseCode ? descriptionMap[baseCode] || "" : "")
      : "";
    const coverUrl = coverFile ? blobAssets.covers?.[coverFile] || "" : "";
    const audioUrl = blobAssets.audios?.[file] || "";
    return {
      title: cleanTitle(file),
      description,
      skuCode: code || "",
      categories: [],
      coverUrl,
      audioUrl,
      interestIds: [],
      allowedUserEmails: [],
      order: index + 1,
      isAdult: isAdultContent(file) || (coverFile ? isAdultContent(coverFile) : false)
    };
  });
};
