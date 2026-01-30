import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");

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
  createdAt: string;
  order: number;
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

export const getLibrary = () =>
  readJson<LibraryItem[]>("library.json", [
    {
      id: "track-1",
      title: "Night Reset",
      description: "Guided meditation for deep sleep.",
      coverUrl: "/covers/placeholder.png",
      audioUrl: "/audio/placeholder.mp3",
      interestIds: ["sleep"],
      createdAt: new Date().toISOString(),
      order: 1
    }
  ]);

export const saveLibrary = (records: LibraryItem[]) =>
  writeJson("library.json", records);

export const getLibrarySorted = () =>
  getLibrary().slice().sort((a, b) => a.order - b.order);
