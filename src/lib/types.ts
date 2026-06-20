export type AffiliateRecord = {
  id: string;
  name: string;
  email: string;
  payoutAddress: string;
  createdAt: string;
  status: "pending" | "approved" | "paused";
  affiliateCode?: string | null;
  userId?: string | null;
};

export type AdminAccount = {
  id: string;
  email: string;
  /** Present when loading credentials for login only; omitted from list APIs. */
  passwordHash?: string;
  status: "active" | "paused";
  createdAt: string;
  firstName?: string | null;
  lastName?: string | null;
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
  phone?: string;
  website?: string;
  socialLinks?: string;
  photoUrl?: string;
  profileSlug?: string;
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
  audioIdA?: string | null;
  audioIdB?: string | null;
  audioIdC?: string | null;
  isAdult?: boolean;
  categories?: string[];
  createdAt: string;
};

export type LibraryItem = {
  id: string;
  title: string;
  description: string;
  skuCode?: string;
  fileName?: string;
  categories?: string[];
  coverUrl: string;
  audioUrl: string;
  interestIds: string[];
  allowedUserEmails?: string[];
  createdAt: string;
  order: number;
  isAdult?: boolean;
};

export type SubscriptionPlan = {
  id: string;
  name: string;
  priceId: string;
  trialDays: number;
  description: string;
};

export type PlaybackSettings = {
  playsPerRecording: number;
  nightlyGapHours: number;
  addNewTrackEveryNights: number;
  initialTracks: number;
  cgmrTrackId: string;
  fallbackTrackId: string;
};
