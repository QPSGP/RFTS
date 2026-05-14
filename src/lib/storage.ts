import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const audiosDir = path.join(process.cwd(), "Audios");
const coversDir = path.join(process.cwd(), "Covers");

const ensureDataDir = () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

const readJson = <T>(fileName: string, fallback: T): T => {
  ensureDataDir();
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

const writeJson = <T>(fileName: string, data: T) => {
  ensureDataDir();
  const filePath = path.join(dataDir, fileName);
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tempPath, filePath);
};

export type AffiliateRecord = {
  id: string;
  name: string;
  email: string;
  payoutAddress: string;
  createdAt: string;
  status: "pending" | "approved" | "paused";
};

export type ModerationItem = {
  id: string;
  title: string;
  creator: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  notes?: string;
};

export type ModeratorApplication = {
  id: string;
  name: string;
  email: string;
  focusAreas: string;
  experience: string;
  links?: string;
  submittedAt: string;
  status: "pending" | "approved" | "declined";
};

export type ModeratorAccount = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  assignedUserEmails: string[];
  status: "active" | "paused";
  createdAt: string;
};

export type Interest = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
};

export type LibraryItem = {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  audioUrl: string;
  interestIds: string[];
  allowedUserEmails?: string[];
  createdAt: string;
  order: number;
  isAdult?: boolean;
};

export const getAffiliates = () =>
  readJson<AffiliateRecord[]>("affiliates.json", []);

export const saveAffiliates = (records: AffiliateRecord[]) =>
  writeJson("affiliates.json", records);

export const getModerationQueue = () =>
  readJson<ModerationItem[]>("moderation.json", [
    {
      id: "m1",
      title: "Night Reset - 10 min",
      creator: "Ava Lane",
      submittedAt: new Date().toISOString(),
      status: "pending"
    }
  ]);

export const saveModerationQueue = (records: ModerationItem[]) =>
  writeJson("moderation.json", records);

export const getModeratorApplications = () =>
  readJson<ModeratorApplication[]>("moderator-applications.json", []);

export const saveModeratorApplications = (records: ModeratorApplication[]) =>
  writeJson("moderator-applications.json", records);

export const getModerators = () =>
  readJson<ModeratorAccount[]>("moderators.json", []);

export const saveModerators = (records: ModeratorAccount[]) =>
  writeJson("moderators.json", records);

export const findModeratorByEmail = (email: string) => {
  const moderators = getModerators();
  return moderators.find(
    (moderator) => moderator.email.toLowerCase() === email.toLowerCase()
  );
};

export const getInterests = () =>
  readJson<Interest[]>("interests.json", [
    {
      id: "accepting-loss-of-love-partner",
      name: "Accepting Loss of Love Partner",
      createdAt: "2023-11-14T21:48:39.000Z"
    },
    {
      id: "phobias-control",
      name: "Phobia(s) Control",
      createdAt: "2020-08-13T17:39:54.000Z"
    },
    {
      id: "physical-balance",
      name: "Physical Balance",
      createdAt: "2023-11-14T21:47:56.000Z"
    },
    {
      id: "psychic-abilities",
      name: "Psychic Abilities",
      createdAt: "2020-08-13T17:39:54.000Z"
    },
    {
      id: "public-speaking",
      name: "Public Speaking",
      createdAt: "2020-08-13T17:39:54.000Z"
    },
    {
      id: "relationship-joy",
      name: "Relationship Joy",
      createdAt: "2020-08-13T17:39:54.000Z"
    },
    {
      id: "release-jealousy-monogamous",
      name: "Release Jealousy-Monogamous",
      createdAt: "2020-08-13T17:39:54.000Z"
    },
    {
      id: "sales-skills",
      name: "Sales Skills",
      createdAt: "2020-08-13T17:39:54.000Z"
    },
    {
      id: "saving-money",
      name: "Saving Money",
      createdAt: "2020-08-13T17:39:54.000Z"
    },
    {
      id: "sleep-well",
      name: "Sleep Well",
      createdAt: "2020-08-13T17:39:54.000Z"
    },
    {
      id: "speed-reading",
      name: "Speed Reading",
      createdAt: "2020-08-13T17:39:54.000Z"
    },
    {
      id: "spiritual-growth",
      name: "Spiritual Growth",
      createdAt: "2020-08-13T17:39:54.000Z"
    },
    {
      id: "stop-drinking",
      name: "Stop Drinking",
      createdAt: "2020-08-13T17:39:54.000Z"
    },
    {
      id: "stop-smoking",
      name: "Stop Smoking",
      createdAt: "2020-08-13T17:39:54.000Z"
    },
    {
      id: "stress-management",
      name: "Stress Management",
      createdAt: "2020-08-13T17:39:54.000Z"
    },
    {
      id: "test-taking",
      name: "Test Taking",
      createdAt: "2020-08-13T17:39:54.000Z"
    },
    {
      id: "time-management",
      name: "Time Management",
      createdAt: "2020-08-13T17:39:54.000Z"
    },
    {
      id: "weight-control",
      name: "Weight Control",
      createdAt: "2020-08-13T17:39:54.000Z"
    }
  ]);

export const saveInterests = (records: Interest[]) =>
  writeJson("interests.json", records);

const listFiles = (dirPath: string, ext: string) => {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  return fs
    .readdirSync(dirPath)
    .filter((file) => file.toLowerCase().endsWith(ext))
    .sort((a, b) => a.localeCompare(b));
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

const getRecordingDescriptions = () => {
  return readJson<Record<string, string>>("recording-descriptions.json", {});
};

type BlobAssets = {
  audios?: Record<string, string>;
  covers?: Record<string, string>;
};

const getBlobAssets = () => {
  return readJson<BlobAssets>("blob-assets.json", {});
};

const buildLibraryFromFiles = () => {
  const blobAssets = getBlobAssets();
  const localAudioFiles = listFiles(audiosDir, ".mp3");
  const localCoverFiles = listFiles(coversDir, ".png");
  const audioFiles =
    localAudioFiles.length > 0
      ? localAudioFiles
      : Object.keys(blobAssets.audios || {});
  const coverFiles =
    localCoverFiles.length > 0
      ? localCoverFiles
      : Object.keys(blobAssets.covers || {});
  const coverMap = new Map<string, string>();
  const descriptionMap = getRecordingDescriptions();

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
    const blobCoverUrl = coverFile ? blobAssets.covers?.[coverFile] : undefined;
    const blobAudioUrl = blobAssets.audios?.[file];
    return {
      id: `track-${index + 1}`,
      title: cleanTitle(file),
      description,
      coverUrl: blobCoverUrl
        ? blobCoverUrl
        : coverFile
          ? `/api/asset?type=cover&file=${encodeURIComponent(coverFile)}`
          : "",
      audioUrl: blobAudioUrl
        ? blobAudioUrl
        : `/api/asset?type=audio&file=${encodeURIComponent(file)}`,
      interestIds: [],
      createdAt: new Date().toISOString(),
      order: index + 1,
      isAdult: isAdultContent(file) || (coverFile ? isAdultContent(coverFile) : false)
    };
  });
};

export const getLibrary = () =>
  readJson<LibraryItem[]>("library.json", buildLibraryFromFiles());

export const saveLibrary = (records: LibraryItem[]) =>
  writeJson("library.json", records);

export const getLibrarySorted = () =>
  getLibrary().slice().sort((a, b) => a.order - b.order);

export type SubscriptionPlan = {
  id: string;
  name: string;
  priceId: string;
  trialDays: number;
  description: string;
};

export const getSubscriptionPlans = () =>
  readJson<SubscriptionPlan[]>("subscriptions.json", [
    {
      id: "platinum",
      name: "Membership",
      priceId: "",
      trialDays: 14,
      description: "Tailored Recordings Are Scheduled Based on Your Priorities."
    }
  ]);

export const saveSubscriptionPlans = (records: SubscriptionPlan[]) =>
  writeJson("subscriptions.json", records);

export type PlaybackSettings = {
  playsPerRecording: number;
  nightlyGapHours: number;
  addNewTrackEveryNights: number;
  initialTracks: number;
  cgmrTrackId: string;
  fallbackTrackId: string;
};

export const getPlaybackSettings = () =>
  readJson<PlaybackSettings>("playback-settings.json", {
    playsPerRecording: 21,
    nightlyGapHours: 2.5,
    addNewTrackEveryNights: 14,
    /** Total rotation size = goal slots + 1 CGMR/T-18 slot; 4 ⇒ three goals (matches defaultPlaybackSettings in content-seed). */
    initialTracks: 4,
    cgmrTrackId: "",
    fallbackTrackId: "T-18"
  });

export const savePlaybackSettings = (settings: PlaybackSettings) =>
  writeJson("playback-settings.json", settings);
