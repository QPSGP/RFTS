import crypto from "crypto";
import { sql } from "@vercel/postgres";
import type {
  AdminAccount,
  AffiliateRecord,
  Interest,
  LibraryItem,
  ModerationItem,
  ModeratorAccount,
  ModeratorApplication,
  PlaybackSettings,
  SubscriptionPlan
} from "@/lib/types";
import {
  buildLibrarySeedFromAssets,
  defaultInterests,
  defaultPlaybackSettings,
  defaultSubscriptionPlans
} from "@/lib/content-seed";
import { generateAffiliateCode, normalizeAffiliateCode } from "@/lib/affiliate-code";
import { resolveReportIssueAttachmentUrls } from "@/lib/report-issue-attachments";
import { stripSkuHyphens } from "@/lib/sku-code";
import type { EmailStaffListKey } from "@/lib/email-staff-lists";
import {
  EMAIL_STAFF_LIST_KEYS,
  defaultEmailsForList,
  normalizeEmailList
} from "@/lib/email-staff-lists";

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string })?.code === "23505";
}

const normalizeLibrarySku = (item: LibraryItem): LibraryItem => ({
  ...item,
  skuCode: item.skuCode ? stripSkuHyphens(item.skuCode) : item.skuCode
});

export type DbUser = {
  id: string;
  email: string;
  password_hash: string;
  goal_ids: string[] | null;
  goal_updated_at: string | null;
  plays_per_night: number | null;
  created_at: string;
};

export type MemberProfile = {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  gender?: string | null;
  yearBorn?: number | null;
  /** Full birth date YYYY-MM-DD when set; used for calendar display and age (year) derivation. */
  birthDate?: string | null;
  contactNumber?: string | null;
  bestContactTimes?: string | null;
  timeZone?: string | null;
  occupation?: string | null;
  incomeGoal?: string | null;
  incomeGoalYear?: number | null;
  incomeGoalRelation?: string | null;
  isFirstResponder?: boolean | null;
  wantsPracticeGrowth?: boolean | null;
  adultConsent?: boolean | null;
  wantsPolyamory?: boolean | null;
  /** Interested in LGD info / follow-up email. */
  wantsLgdInfo?: boolean | null;
  /** Already completed a Life Guidance Discovery Session. */
  hadLgdSession?: boolean | null;
  referralSource?: string | null;
  notes?: string | null;
  affiliatePayoutMethod?: string | null;
  affiliatePayoutDetail?: string | null;
  /** Date (YYYY-MM-DD) when the member's schedule rotation anchor started; used for legacy session backfill window. */
  scheduleStartedAt?: string | null;
  /** Highest schedule night index (1-based) the member has fully completed by listening; drives "tonight". */
  completedScheduleNights?: number | null;
};

export type DbSubscription = {
  id: string;
  user_id: string;
  status: "inactive" | "active" | "past_due" | "canceled";
  tier: "platinum" | "platinum_managed";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
};

export type UserProfile = {
  id: string;
  email: string;
  goalIds: string[];
  goalUpdatedAt: string | null;
  playsPerNight: number;
  subscriptionStatus: DbSubscription["status"] | null;
  subscriptionTier: DbSubscription["tier"] | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

/** Canonical form for member emails in `users` and matching related data. */
export const normalizeMemberEmail = (email: string) => email.trim().toLowerCase();

export const getUserByEmail = async (email: string) => {
  const { rows } = await sql<DbUser>`
    SELECT id, email, password_hash, goal_ids, goal_updated_at, plays_per_night, created_at
    FROM users
    WHERE LOWER(email) = LOWER(${email})
    LIMIT 1
  `;
  return rows[0] || null;
};

export const getUserById = async (userId: string) => {
  const { rows } = await sql<{ id: string; email: string }>`
    SELECT id, email FROM users WHERE id = ${userId} LIMIT 1
  `;
  return rows[0] || null;
};

export const createUser = async (email: string, passwordHash: string) => {
  const canonical = normalizeMemberEmail(email);
  for (let attempt = 0; attempt < 8; attempt++) {
    const affiliateCode = generateAffiliateCode();
    try {
      const { rows } = await sql<DbUser>`
        INSERT INTO users (email, password_hash, affiliate_code)
        VALUES (${canonical}, ${passwordHash}, ${affiliateCode})
        RETURNING id, email, password_hash, goal_ids, goal_updated_at, plays_per_night, created_at
      `;
      const user = rows[0];
      await linkAffiliateApplicationOnMemberSignup(user.id, canonical);
      return user;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw new Error("Could not create user.");
};

export const ensureUserAffiliateCode = async (userId: string): Promise<string> => {
  const { rows: existing } = await sql<{ affiliate_code: string | null }>`
    SELECT affiliate_code FROM users WHERE id = ${userId} LIMIT 1
  `;
  const current = existing[0]?.affiliate_code?.trim();
  if (current) return current.toUpperCase();

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateAffiliateCode();
    try {
      const { rows } = await sql<{ affiliate_code: string }>`
        UPDATE users
        SET affiliate_code = ${code}
        WHERE id = ${userId} AND affiliate_code IS NULL
        RETURNING affiliate_code
      `;
      if (rows[0]?.affiliate_code) return rows[0].affiliate_code;
      const { rows: again } = await sql<{ affiliate_code: string | null }>`
        SELECT affiliate_code FROM users WHERE id = ${userId} LIMIT 1
      `;
      if (again[0]?.affiliate_code) return again[0].affiliate_code;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw new Error("Could not assign affiliate code.");
};

export const linkAffiliateApplicationOnMemberSignup = async (userId: string, email: string) => {
  const canonical = normalizeMemberEmail(email);
  const { rows: appRows } = await sql<{ id: string; affiliate_code: string | null }>`
    SELECT id, affiliate_code
    FROM affiliate_applications
    WHERE LOWER(email) = LOWER(${canonical}) AND status = 'approved'
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const app = appRows[0];
  if (!app) return;

  const { rows: userRows } = await sql<{ affiliate_code: string | null }>`
    SELECT affiliate_code FROM users WHERE id = ${userId} LIMIT 1
  `;
  const userCode = userRows[0]?.affiliate_code?.trim() || null;

  await sql`UPDATE affiliate_applications SET user_id = ${userId} WHERE id = ${app.id}`;

  if (app.affiliate_code?.trim()) {
    const appCode = app.affiliate_code.trim().toUpperCase();
    await sql`UPDATE users SET affiliate_code = ${appCode} WHERE id = ${userId}`;
  } else if (userCode) {
    await sql`UPDATE affiliate_applications SET affiliate_code = ${userCode} WHERE id = ${app.id}`;
  } else {
    const code = await ensureUserAffiliateCode(userId);
    await sql`UPDATE affiliate_applications SET affiliate_code = ${code} WHERE id = ${app.id}`;
  }
};

export const setUserReferredByAffiliateCode = async (
  userId: string,
  codeRaw: string | null | undefined,
  userEmail: string
) => {
  const code = normalizeAffiliateCode(codeRaw);
  if (!code) return;

  const { rows: referrerRows } = await sql<{ email: string }>`
    SELECT email FROM users WHERE affiliate_code = ${code} LIMIT 1
  `;
  if (referrerRows[0]) {
    if (normalizeMemberEmail(referrerRows[0].email) === normalizeMemberEmail(userEmail)) return;
    await sql`UPDATE users SET referred_by_affiliate_code = ${code} WHERE id = ${userId}`;
    return;
  }

  const { rows: appRows } = await sql`
    SELECT 1 FROM affiliate_applications
    WHERE affiliate_code = ${code} AND status = 'approved'
    LIMIT 1
  `;
  if (appRows[0]) {
    await sql`UPDATE users SET referred_by_affiliate_code = ${code} WHERE id = ${userId}`;
  }
};

export const isValidAffiliateReferralCode = async (codeRaw: string): Promise<boolean> => {
  const code = normalizeAffiliateCode(codeRaw);
  if (!code) return false;
  const { rows: userRows } = await sql`
    SELECT 1 FROM users WHERE affiliate_code = ${code} LIMIT 1
  `;
  if (userRows[0]) return true;
  const { rows: appRows } = await sql`
    SELECT 1 FROM affiliate_applications
    WHERE affiliate_code = ${code} AND status = 'approved'
    LIMIT 1
  `;
  return !!appRows[0];
};

export const deleteUserByEmail = async (email: string) => {
  await sql`
    DELETE FROM users
    WHERE LOWER(email) = LOWER(${email})
  `;
};

export const createPasswordResetToken = async (
  userId: string,
  token: string,
  expiresAt: Date
) => {
  const expiresAtStr = expiresAt.toISOString();
  await sql`
    INSERT INTO password_reset_tokens (token, user_id, expires_at)
    VALUES (${token}, ${userId}, ${expiresAtStr})
  `;
};

export const getPasswordResetTokenByToken = async (token: string) => {
  const { rows } = await sql<{ user_id: string }>`
    SELECT user_id FROM password_reset_tokens
    WHERE token = ${token} AND expires_at > now()
    LIMIT 1
  `;
  return rows[0] || null;
};

export const deletePasswordResetToken = async (token: string) => {
  await sql`DELETE FROM password_reset_tokens WHERE token = ${token}`;
};

export const updateUserPassword = async (userId: string, passwordHash: string): Promise<boolean> => {
  const { rows } = await sql<{ id: string }>`
    UPDATE users SET password_hash = ${passwordHash}
    WHERE id = ${userId}
    RETURNING id
  `;
  return rows.length > 0;
};

/** Set `users.email` to lowercase trimmed form (fixes legacy ALL-CAPS rows; safe if already normalized). */
export const canonicalizeUserEmail = async (userId: string) => {
  await sql`
    UPDATE users
    SET email = LOWER(TRIM(email))
    WHERE id = ${userId}
  `;
};

export const ensureSubscription = async (
  userId: string,
  tier: DbSubscription["tier"],
  status: DbSubscription["status"]
) => {
  const { rows } = await sql<DbSubscription>`
    INSERT INTO subscriptions (user_id, tier, status)
    VALUES (${userId}, ${tier}, ${status})
    ON CONFLICT (user_id)
    DO UPDATE SET tier = EXCLUDED.tier, status = EXCLUDED.status
    RETURNING id, user_id, status, tier, stripe_customer_id, stripe_subscription_id, current_period_end
  `;
  return rows[0];
};

export type SubscriptionStripeIds = {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

export const getSubscriptionStripeIdsForUser = async (
  userId: string
): Promise<SubscriptionStripeIds | null> => {
  const { rows } = await sql<{ stripe_customer_id: string | null; stripe_subscription_id: string | null }>`
    SELECT stripe_customer_id, stripe_subscription_id
    FROM subscriptions
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id
  };
};

/** Persist Stripe customer + subscription after Checkout completes (webhook). */
export const setSubscriptionStripeIdsForUser = async (
  userId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string
) => {
  await sql`
    UPDATE subscriptions
    SET
      stripe_customer_id = ${stripeCustomerId},
      stripe_subscription_id = ${stripeSubscriptionId}
    WHERE user_id = ${userId}
  `;
};

/** Admin migration: link existing Stripe customer/subscription without a new Checkout. */
export const updateSubscriptionStripeIdsForUser = async (
  userId: string,
  stripeCustomerId: string | null,
  stripeSubscriptionId: string | null
) => {
  await sql`
    UPDATE subscriptions
    SET
      stripe_customer_id = ${stripeCustomerId?.trim() || null},
      stripe_subscription_id = ${stripeSubscriptionId?.trim() || null}
    WHERE user_id = ${userId}
  `;
};

export const setUserGoals = async (userId: string, goalIds: string[]) => {
  const goalArray = toPgArray(goalIds);
  const { rows } = await sql<DbUser>`
    UPDATE users
    SET goal_ids = ${goalArray}::text[], goal_updated_at = now()
    WHERE id = ${userId}
    RETURNING id, email, password_hash, goal_ids, goal_updated_at, plays_per_night, created_at
  `;
  return rows[0];
};

export const setUserPlaysPerNight = async (userId: string, playsPerNight: number) => {
  const { rows } = await sql<DbUser>`
    UPDATE users
    SET plays_per_night = ${playsPerNight}
    WHERE id = ${userId}
    RETURNING id, email, password_hash, goal_ids, goal_updated_at, plays_per_night, created_at
  `;
  return rows[0];
};

export const setUserScreenWakeEnabled = async (userId: string, enabled: boolean) => {
  try {
    await sql`
      UPDATE users
      SET screen_wake_enabled = ${enabled}
      WHERE id = ${userId}
    `;
  } catch (err) {
    console.error("[setUserScreenWakeEnabled]", err instanceof Error ? err.message : err);
  }
};

export const getUserScreenWakeEnabled = async (userId: string): Promise<boolean> => {
  try {
    const { rows } = await sql<{ enabled: boolean }>`
      SELECT COALESCE(screen_wake_enabled, false) AS enabled
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;
    return rows[0]?.enabled ?? false;
  } catch {
    return false;
  }
};

let memberProfileLgdInfoReady = false;

/**
 * Ensure wants_lgd_info exists. One-time: legacy UI stored “interested in LGD” in had_lgd_session -
 * copy to wants_lgd_info and clear had_lgd_session for those rows only.
 */
const ensureMemberProfileLgdInfoColumn = async () => {
  if (memberProfileLgdInfoReady) return;
  await sql`
    ALTER TABLE member_profiles
    ADD COLUMN IF NOT EXISTS wants_lgd_info boolean DEFAULT false
  `;
  await sql`
    ALTER TABLE member_profiles
    ADD COLUMN IF NOT EXISTS lgd_interest_migrated boolean DEFAULT false
  `;
  await sql`
    UPDATE member_profiles
    SET
      wants_lgd_info = true,
      had_lgd_session = false,
      lgd_interest_migrated = true
    WHERE COALESCE(lgd_interest_migrated, false) = false
      AND COALESCE(had_lgd_session, false) = true
  `;
  await sql`
    UPDATE member_profiles
    SET lgd_interest_migrated = true
    WHERE COALESCE(lgd_interest_migrated, false) = false
  `;
  memberProfileLgdInfoReady = true;
};

export const upsertMemberProfile = async (profile: MemberProfile) => {
  await ensureMemberProfileLgdInfoColumn();
  const birthDate = profile.birthDate?.trim() || null;
  const yearFromBirthDate =
    birthDate != null
      ? (() => {
          const y = parseInt(birthDate.slice(0, 4), 10);
          return !Number.isNaN(y) && y >= 1900 && y <= 2100 ? y : null;
        })()
      : null;
  const yearBorn = yearFromBirthDate ?? profile.yearBorn ?? null;
  const normalizedBirthDate =
    birthDate != null && typeof birthDate === "string" ? birthDate.trim().slice(0, 10) : null;
  const birthDateForDb =
    normalizedBirthDate && /^\d{4}-\d{2}-\d{2}$/.test(normalizedBirthDate)
      ? normalizedBirthDate
      : yearBorn != null
        ? `${yearBorn}-01-01`
        : null;

  await sql`
    INSERT INTO member_profiles (
      user_id,
      first_name,
      last_name,
      gender,
      year_born,
      birth_date,
      contact_number,
      best_contact_times,
      time_zone,
      occupation,
      income_goal,
      income_goal_year,
      income_goal_relation,
      is_first_responder,
      wants_practice_growth,
      adult_consent,
      wants_polyamory,
      wants_lgd_info,
      had_lgd_session,
      referral_source,
      notes,
      affiliate_payout_method,
      affiliate_payout_detail
    )
    VALUES (
      ${profile.userId},
      ${profile.firstName || null},
      ${profile.lastName || null},
      ${profile.gender || null},
      ${yearBorn},
      ${birthDateForDb},
      ${profile.contactNumber || null},
      ${profile.bestContactTimes || null},
      ${profile.timeZone || null},
      ${profile.occupation || null},
      ${profile.incomeGoal || null},
      ${profile.incomeGoalYear || null},
      ${profile.incomeGoalRelation || null},
      ${profile.isFirstResponder ?? false},
      ${profile.wantsPracticeGrowth ?? false},
      ${profile.adultConsent ?? false},
      ${profile.wantsPolyamory ?? false},
      ${profile.wantsLgdInfo ?? false},
      ${profile.hadLgdSession ?? false},
      ${profile.referralSource || null},
      ${profile.notes || null},
      ${profile.affiliatePayoutMethod || null},
      ${profile.affiliatePayoutDetail || null}
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      gender = EXCLUDED.gender,
      year_born = EXCLUDED.year_born,
      birth_date = EXCLUDED.birth_date,
      contact_number = EXCLUDED.contact_number,
      best_contact_times = EXCLUDED.best_contact_times,
      time_zone = EXCLUDED.time_zone,
      occupation = EXCLUDED.occupation,
      income_goal = EXCLUDED.income_goal,
      income_goal_year = EXCLUDED.income_goal_year,
      income_goal_relation = EXCLUDED.income_goal_relation,
      is_first_responder = EXCLUDED.is_first_responder,
      wants_practice_growth = EXCLUDED.wants_practice_growth,
      adult_consent = EXCLUDED.adult_consent,
      wants_polyamory = EXCLUDED.wants_polyamory,
      wants_lgd_info = EXCLUDED.wants_lgd_info,
      had_lgd_session = EXCLUDED.had_lgd_session,
      referral_source = EXCLUDED.referral_source,
      notes = EXCLUDED.notes,
      affiliate_payout_method = EXCLUDED.affiliate_payout_method,
      affiliate_payout_detail = EXCLUDED.affiliate_payout_detail,
      updated_at = now()
  `;
};

export const getMemberProfileByUserId = async (userId: string): Promise<MemberProfile | null> => {
  await ensureMemberProfileLgdInfoColumn();
  const { rows } = await sql<Omit<MemberProfile, "birthDate"> & { birth_date: string | null }>`
    SELECT
      user_id as "userId",
      first_name as "firstName",
      last_name as "lastName",
      gender,
      year_born as "yearBorn",
      birth_date,
      contact_number as "contactNumber",
      best_contact_times as "bestContactTimes",
      time_zone as "timeZone",
      occupation,
      income_goal as "incomeGoal",
      income_goal_year as "incomeGoalYear",
      income_goal_relation as "incomeGoalRelation",
      is_first_responder as "isFirstResponder",
      wants_practice_growth as "wantsPracticeGrowth",
      adult_consent as "adultConsent",
      wants_polyamory as "wantsPolyamory",
      wants_lgd_info as "wantsLgdInfo",
      had_lgd_session as "hadLgdSession",
      referral_source as "referralSource",
      notes,
      affiliate_payout_method as "affiliatePayoutMethod",
      affiliate_payout_detail as "affiliatePayoutDetail",
      schedule_started_at as "scheduleStartedAt",
      COALESCE(completed_schedule_nights, 0) AS "completedScheduleNights"
    FROM member_profiles
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  const { birth_date: bd, ...rest } = row;
  const birthDate =
    bd == null
      ? null
      : typeof bd === "string"
        ? bd.trim().slice(0, 10)
        : (bd as unknown) instanceof Date
          ? (bd as Date).toISOString().slice(0, 10)
          : /^\d{4}-\d{2}-\d{2}/.test(String(bd))
            ? String(bd).slice(0, 10)
            : null;
  const yearBorn =
    birthDate != null
      ? (() => {
          const y = parseInt(birthDate.slice(0, 4), 10);
          return !Number.isNaN(y) && y >= 1900 && y <= 2100 ? y : rest.yearBorn ?? null;
        })()
      : rest.yearBorn ?? null;
  return {
    ...rest,
    birthDate: birthDate ?? null,
    yearBorn
  } as MemberProfile;
};

/** Set schedule start to today (UTC date). Used when first loading schedule or when goals change so rotation restarts. Resets play-based night progress. Upserts so rotation works even if member_profiles row was missing. */
export const setScheduleStartedToToday = async (userId: string): Promise<void> => {
  await sql`
    INSERT INTO member_profiles (user_id, schedule_started_at, completed_schedule_nights, updated_at)
    VALUES (${userId}, (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date, 0, now())
    ON CONFLICT (user_id) DO UPDATE SET
      schedule_started_at = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date,
      completed_schedule_nights = 0,
      updated_at = now()
  `;
};

/** Count session starts since schedule_started_at (UTC midnight of that date). */
export const getSessionCountSinceScheduleStart = async (
  userId: string,
  scheduleStartedAtYyyyMmDd: string
): Promise<number> => {
  try {
    const trimmed = scheduleStartedAtYyyyMmDd.trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return 0;
    }
    const startIso = `${trimmed}T00:00:00.000Z`;
    const { rows } = await sql<{ count: string }>`
      SELECT COUNT(*)::text AS count
      FROM member_session_usage
      WHERE user_id = ${userId}
        AND used_at >= ${startIso}::timestamptz
    `;
    return parseInt(rows[0]?.count || "0", 10) || 0;
  } catch {
    return 0;
  }
};

/**
 * If the member has never stored play-based progress (0), seed completed nights from historical
 * session starts since schedule_started_at (capped at SCHEDULE_MAX_NIGHTS). One-time alignment for existing members.
 */
export const trySeedCompletedNightsFromLegacySessions = async (
  userId: string,
  scheduleStartedAtYyyyMmDd: string
): Promise<number> => {
  try {
    const sessionCount = await getSessionCountSinceScheduleStart(userId, scheduleStartedAtYyyyMmDd);
    if (sessionCount <= 0) {
      const { rows: cur } = await sql<{ c: string | null }>`
        SELECT COALESCE(completed_schedule_nights, 0)::text AS c
        FROM member_profiles
        WHERE user_id = ${userId}
        LIMIT 1
      `;
      return parseInt(cur[0]?.c || "0", 10) || 0;
    }
    const seeded = Math.min(732, sessionCount);
    const { rows } = await sql<{ c: string | null }>`
      UPDATE member_profiles
      SET completed_schedule_nights = ${seeded},
          updated_at = now()
      WHERE user_id = ${userId}
        AND COALESCE(completed_schedule_nights, 0) = 0
      RETURNING completed_schedule_nights::text AS c
    `;
    if (rows[0]) {
      return parseInt(rows[0].c || "0", 10) || 0;
    }
    const { rows: cur } = await sql<{ c: string | null }>`
      SELECT COALESCE(completed_schedule_nights, 0)::text AS c
      FROM member_profiles
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    return parseInt(cur[0]?.c || "0", 10) || 0;
  } catch {
    return 0;
  }
};

export type RecordScheduleNightResult =
  | { ok: true; completedScheduleNights: number }
  | { ok: false; error: string };

/**
 * Convert legacy progress (schedule-night index) to main audios played for all members not yet migrated.
 * Safe to run repeatedly - only updates rows with schedule_progress_model <> 1.
 */
export const migrateAllMembersScheduleProgressToMainAudios = async (): Promise<{
  ok: true;
  updated: number;
}> => {
  try {
    const { rowCount } = await sql`
      UPDATE member_profiles mp
      SET
        completed_schedule_nights = CASE
          WHEN COALESCE(u.plays_per_night, 2) = 1 THEN LEAST(732, COALESCE(mp.completed_schedule_nights, 0))
          ELSE LEAST(732, COALESCE(mp.completed_schedule_nights, 0) * 2)
        END,
        schedule_progress_model = 1,
        updated_at = now()
      FROM users u
      WHERE u.id = mp.user_id
        AND COALESCE(mp.schedule_progress_model, 0) <> 1
    `;
    return { ok: true, updated: rowCount ?? 0 };
  } catch {
    return { ok: true, updated: 0 };
  }
};

/** Per-member migration on schedule load when bulk migration has not run yet. */
export const ensureMemberScheduleProgressMigrated = async (
  userId: string,
  playsPerNight: 1 | 2
): Promise<number> => {
  const ppn = playsPerNight === 1 ? 1 : 2;
  try {
    const { rows } = await sql<{ c: string | null; model: string | null }>`
      SELECT COALESCE(completed_schedule_nights, 0)::text AS c,
             COALESCE(schedule_progress_model, 0)::text AS model
      FROM member_profiles
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    if (!rows[0]) return 0;
    const model = parseInt(rows[0].model || "0", 10) || 0;
    const completed = parseInt(rows[0].c || "0", 10) || 0;
    if (model === 1) return completed;
    const main =
      ppn === 1 ? completed : Math.min(732, completed * 2);
    await sql`
      UPDATE member_profiles
      SET completed_schedule_nights = ${main},
          schedule_progress_model = 1,
          updated_at = now()
      WHERE user_id = ${userId}
    `;
    return main;
  } catch {
    return 0;
  }
};

/**
 * Mark a schedule step as fully listened. Stores **main goal audios completed** (not schedule-night index)
 * so playlist/lineup stay the same when the member switches 1 vs 2 audios per night.
 */
export const recordScheduleNightCompleted = async (
  userId: string,
  _scheduleNightCompleted: number,
  playsPerNight: 1 | 2
): Promise<RecordScheduleNightResult> => {
  const ppn = playsPerNight === 1 ? 1 : 2;
  const maxMain = 732 * 2;
  try {
    const { rows: existing } = await sql<{ c: string | null }>`
      SELECT COALESCE(completed_schedule_nights, 0)::text AS c
      FROM member_profiles
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    if (!existing[0]) {
      return { ok: false, error: "Member profile not found." };
    }
    const completed = parseInt(existing[0].c || "0", 10) || 0;
    const mainAudiosAfter = Math.min(maxMain, completed + ppn);
    if (mainAudiosAfter <= completed) {
      return { ok: true, completedScheduleNights: completed };
    }
    await sql`
      UPDATE member_profiles
      SET completed_schedule_nights = ${mainAudiosAfter},
          schedule_progress_model = 1,
          updated_at = now()
      WHERE user_id = ${userId}
    `;
    return { ok: true, completedScheduleNights: mainAudiosAfter };
  } catch {
    return { ok: false, error: "Could not save progress." };
  }
};

/** Admin: set completed main audios played (0–732). Does not change schedule_started_at. */
export const adminSetMemberCompletedScheduleNights = async (
  userId: string,
  completedScheduleNights: number
): Promise<{ ok: true; completedScheduleNights: number } | { ok: false; error: string }> => {
  const n = Math.floor(completedScheduleNights);
  if (!Number.isFinite(n) || n < 0 || n > 732) {
    return { ok: false, error: "Completed audios must be between 0 and 732." };
  }
  try {
    const { rowCount } = await sql`
      UPDATE member_profiles
      SET completed_schedule_nights = ${n},
          schedule_progress_model = 1,
          updated_at = now()
      WHERE user_id = ${userId}
    `;
    if (!rowCount) {
      return { ok: false, error: "Member profile not found." };
    }
    return { ok: true, completedScheduleNights: n };
  } catch {
    return { ok: false, error: "Could not update schedule progress." };
  }
};

/**
 * Admin / internal testing: clear stored schedule anchor so the member effectively restarts at night 1.
 * Next `/api/user/schedule` load sets `schedule_started_at` to today and does not backfill from old session rows.
 * Does not change goals, plays-per-night, or subscriptions.
 */
export const adminResetMemberScheduleAnchorForTesting = async (
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> => {
  try {
    await sql`
      INSERT INTO member_profiles (user_id, schedule_started_at, completed_schedule_nights, updated_at)
      VALUES (${userId}, NULL, 0, now())
      ON CONFLICT (user_id) DO UPDATE SET
        schedule_started_at = NULL,
        completed_schedule_nights = 0,
        updated_at = now()
    `;
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reset schedule anchor." };
  }
};

/**
 * If global `initial_tracks` is below 4, set to 4 so rotation uses three goal slots plus the CGMR/T-18 cadence.
 * Single-row table (`id = 1`). No-op when already ≥ 4.
 */
export const adminBumpPlaybackInitialTracksToStandardIfLow = async (): Promise<
  { ok: true; initialTracks: number; changed: boolean } | { ok: false; error: string }
> => {
  try {
    const { rows } = await sql<{ initialTracks: string }>`
      UPDATE playback_settings
      SET initial_tracks = 4
      WHERE id = 1 AND initial_tracks < 4
      RETURNING initial_tracks::text AS "initialTracks"
    `;
    if (rows[0]) {
      return {
        ok: true,
        initialTracks: parseInt(rows[0].initialTracks, 10) || 4,
        changed: true
      };
    }
    const cur = await getPlaybackSettings();
    return { ok: true, initialTracks: cur.initialTracks, changed: false };
  } catch {
    return { ok: false, error: "Could not update playback settings." };
  }
};

export const getUserProfile = async (email: string) => {
  const { rows } = await sql<UserProfile>`
    SELECT
      u.id,
      u.email,
      COALESCE(u.goal_ids, ARRAY[]::text[]) AS "goalIds",
      u.goal_updated_at AS "goalUpdatedAt",
      COALESCE(u.plays_per_night, 2) AS "playsPerNight",
      s.status AS "subscriptionStatus",
      s.tier AS "subscriptionTier",
      s.stripe_customer_id AS "stripeCustomerId",
      s.stripe_subscription_id AS "stripeSubscriptionId"
    FROM users u
    LEFT JOIN subscriptions s ON s.user_id = u.id
    WHERE LOWER(u.email) = LOWER(${email})
    LIMIT 1
  `;
  return rows[0] || null;
};

export type UserRowWithName = UserProfile & {
  firstName: string | null;
  lastName: string | null;
  affiliateCode: string | null;
  referredByAffiliateCode: string | null;
};

export const listUsers = async (): Promise<UserRowWithName[]> => {
  const { rows } = await sql<UserRowWithName>`
    SELECT
      u.id,
      u.email,
      COALESCE(u.goal_ids, ARRAY[]::text[]) AS "goalIds",
      u.goal_updated_at AS "goalUpdatedAt",
      COALESCE(u.plays_per_night, 2) AS "playsPerNight",
      s.status AS "subscriptionStatus",
      s.tier AS "subscriptionTier",
      s.stripe_customer_id AS "stripeCustomerId",
      s.stripe_subscription_id AS "stripeSubscriptionId",
      mp.first_name AS "firstName",
      mp.last_name AS "lastName",
      u.affiliate_code AS "affiliateCode",
      u.referred_by_affiliate_code AS "referredByAffiliateCode"
    FROM users u
    LEFT JOIN subscriptions s ON s.user_id = u.id
    LEFT JOIN member_profiles mp ON mp.user_id = u.id
    ORDER BY u.created_at DESC
  `;
  return rows;
};

export type MemberActivityRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  goalUpdatedAt: string | null;
  subscriptionStatus: string | null;
  subscriptionTier: string | null;
  currentPeriodEnd: string | null;
  goalCount: number;
  playsPerNight: number;
  sessionsUsedToday: number;
  sessionsUsedLast7: number;
  sessionsTotal: number;
};

export type MemberActivitySummary = {
  totalMembers: number;
  activeSubscriptions: number;
  newThisMonth: number;
  totalSessionsUsedToday: number;
  totalSessionsUsedLast7: number;
};

export const getMemberActivityAnalytics = async (): Promise<{
  summary: MemberActivitySummary;
  members: MemberActivityRow[];
}> => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { rows: memberRows } = await sql<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    createdAt: string;
    goalUpdatedAt: string | null;
    subscriptionStatus: string | null;
    subscriptionTier: string | null;
    currentPeriodEnd: string | null;
    goalIds: string[];
    playsPerNight: number;
  }>`
    SELECT
      u.id,
      u.email,
      mp.first_name AS "firstName",
      mp.last_name AS "lastName",
      u.created_at AS "createdAt",
      u.goal_updated_at AS "goalUpdatedAt",
      s.status AS "subscriptionStatus",
      s.tier AS "subscriptionTier",
      s.stripe_customer_id AS "stripeCustomerId",
      s.stripe_subscription_id AS "stripeSubscriptionId",
      s.current_period_end AS "currentPeriodEnd",
      COALESCE(u.goal_ids, ARRAY[]::text[]) AS "goalIds",
      COALESCE(u.plays_per_night, 2) AS "playsPerNight"
    FROM users u
    LEFT JOIN subscriptions s ON s.user_id = u.id
    LEFT JOIN member_profiles mp ON mp.user_id = u.id
    ORDER BY u.created_at DESC
  `;

  const [usageCounts, totalCounts] = await Promise.all([
    getSessionUsageCountsByUser(),
    getTotalSessionCountByUser()
  ]);

  const members: MemberActivityRow[] = memberRows.map((r) => {
    const usage = usageCounts.get(r.id) || { sessionsToday: 0, sessionsLast7: 0 };
    return {
      id: r.id,
      email: r.email,
      firstName: r.firstName ?? null,
      lastName: r.lastName ?? null,
      createdAt: r.createdAt,
      goalUpdatedAt: r.goalUpdatedAt,
      subscriptionStatus: r.subscriptionStatus,
      subscriptionTier: r.subscriptionTier,
      currentPeriodEnd: r.currentPeriodEnd,
      goalCount: Array.isArray(r.goalIds) ? r.goalIds.length : 0,
      playsPerNight: r.playsPerNight ?? 2,
      sessionsUsedToday: usage.sessionsToday,
      sessionsUsedLast7: usage.sessionsLast7,
      sessionsTotal: totalCounts.get(r.id) ?? 0
    };
  });

  const totalMembers = members.length;
  const activeSubscriptions = members.filter((m) => m.subscriptionStatus === "active").length;
  const newThisMonth = members.filter((m) => m.createdAt >= startOfMonth).length;
  const totalSessionsUsedToday = members.reduce((sum, m) => sum + m.sessionsUsedToday, 0);
  const totalSessionsUsedLast7 = members.reduce((sum, m) => sum + m.sessionsUsedLast7, 0);

  return {
    summary: {
      totalMembers,
      activeSubscriptions,
      newThisMonth,
      totalSessionsUsedToday,
      totalSessionsUsedLast7
    },
    members
  };
};

export const getAdminCount = async () => {
  const { rows } = await sql<{ count: number }>`
    SELECT COUNT(*)::int AS count FROM admins
  `;
  return rows[0]?.count || 0;
};

export const getFirstAdminEmail = async (): Promise<string | null> => {
  const { rows } = await sql<{ email: string }>`
    SELECT email FROM admins
    ORDER BY created_at ASC
    LIMIT 1
  `;
  if (rows[0]) return rows[0].email;
  return process.env.ADMIN_EMAIL || null;
};

const ensureAdminsProfileColumns = async () => {
  try {
    await sql`ALTER TABLE admins ADD COLUMN IF NOT EXISTS first_name text`;
  } catch {
    // ignore
  }
  try {
    await sql`ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_name text`;
  } catch {
    // ignore
  }
};

/** List admins for UI - no password hash. */
export const listAdmins = async () => {
  await ensureAdminsProfileColumns();
  const { rows } = await sql<
    Omit<AdminAccount, "passwordHash"> & { status: string }
  >`
    SELECT
      id,
      email,
      status,
      created_at as "createdAt",
      first_name as "firstName",
      last_name as "lastName"
    FROM admins
    ORDER BY created_at ASC
  `;
  return rows.map((r) => ({
    ...r,
    status: r.status as AdminAccount["status"]
  }));
};

export const getAdminByEmail = async (email: string) => {
  await ensureAdminsProfileColumns();
  const { rows } = await sql<AdminAccount>`
    SELECT
      id,
      email,
      password_hash as "passwordHash",
      status,
      created_at as "createdAt",
      first_name as "firstName",
      last_name as "lastName"
    FROM admins
    WHERE LOWER(email) = LOWER(${email})
    LIMIT 1
  `;
  return rows[0] || null;
};

export const createAdmin = async (
  email: string,
  passwordHash: string,
  profile?: { firstName?: string | null; lastName?: string | null }
) => {
  await ensureAdminsProfileColumns();
  const fn = profile?.firstName?.trim() || null;
  const ln = profile?.lastName?.trim() || null;
  const { rows } = await sql<AdminAccount>`
    INSERT INTO admins (email, password_hash, status, first_name, last_name)
    VALUES (${email}, ${passwordHash}, 'active', ${fn}, ${ln})
    RETURNING
      id,
      email,
      password_hash as "passwordHash",
      status,
      created_at as "createdAt",
      first_name as "firstName",
      last_name as "lastName"
  `;
  return rows[0];
};

export const updateAdminByEmail = async (
  targetEmail: string,
  payload: {
    passwordHash?: string;
    firstName?: string | null;
    lastName?: string | null;
  }
): Promise<boolean> => {
  await ensureAdminsProfileColumns();
  const existing = await getAdminByEmail(targetEmail);
  if (!existing || !existing.passwordHash) {
    return false;
  }
  const nextHash =
    payload.passwordHash !== undefined ? payload.passwordHash : existing.passwordHash;
  const nextFn =
    payload.firstName !== undefined
      ? payload.firstName === null || payload.firstName === ""
        ? null
        : payload.firstName.trim()
      : existing.firstName ?? null;
  const nextLn =
    payload.lastName !== undefined
      ? payload.lastName === null || payload.lastName === ""
        ? null
        : payload.lastName.trim()
      : existing.lastName ?? null;

  await sql`
    UPDATE admins
    SET
      password_hash = ${nextHash},
      first_name = ${nextFn},
      last_name = ${nextLn}
    WHERE id = ${existing.id}
  `;
  return true;
};

const toPgArray = (values: string[]) => {
  if (!values || values.length === 0) {
    return "{}";
  }
  const escaped = values.map((value) =>
    `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
  );
  return `{${escaped.join(",")}}`;
};

const ensureInterestsSeeded = async () => {
  try {
    await sql`ALTER TABLE interests ADD COLUMN is_adult boolean DEFAULT false`;
  } catch {
    // Column already exists
  }
  try {
    await sql`ALTER TABLE interests ADD COLUMN categories text[] DEFAULT ARRAY[]::text[]`;
  } catch {
    // Column already exists
  }
  const { rows } = await sql<{ count: number }>`
    SELECT COUNT(*)::int AS count FROM interests
  `;
  if (rows[0]?.count) {
    return;
  }
  await Promise.all(
    defaultInterests.map((interest) =>
      sql`
        INSERT INTO interests (id, name, description, created_at)
        VALUES (${interest.id}, ${interest.name}, ${interest.description || ""}, ${interest.createdAt})
        ON CONFLICT (id) DO NOTHING
      `
    )
  );
};

const ensureSubscriptionPlansSeeded = async () => {
  await Promise.all(
    defaultSubscriptionPlans.map((plan) =>
      sql`
        INSERT INTO subscription_plans (id, name, price_id, trial_days, description)
        VALUES (${plan.id}, ${plan.name}, ${plan.priceId}, ${plan.trialDays}, ${plan.description})
        ON CONFLICT (id) DO NOTHING
      `
    )
  );
};

const ensurePlaybackSettingsSeeded = async () => {
  const { rows } = await sql<{ count: number }>`
    SELECT COUNT(*)::int AS count FROM playback_settings
  `;
  if (rows[0]?.count) {
    return;
  }
  const settings = defaultPlaybackSettings;
  await sql`
    INSERT INTO playback_settings
      (id, plays_per_recording, nightly_gap_hours, add_new_track_every_nights, initial_tracks, cgmr_track_id, fallback_track_id)
    VALUES
      (1, ${settings.playsPerRecording}, ${settings.nightlyGapHours}, ${settings.addNewTrackEveryNights},
       ${settings.initialTracks}, ${settings.cgmrTrackId}, ${settings.fallbackTrackId})
    ON CONFLICT (id) DO NOTHING
  `;
};

/** Product default for `add_new_track_every_nights` (main plays before next priority joins). Single source: seed. */
const canonicalAddNewTrackEveryMainPlays = () => defaultPlaybackSettings.addNewTrackEveryNights;

/** Migrates legacy installs (e.g. 7) to the current product default so schedule add-rules match the algorithm. */
const normalizePlaybackAddTrackEveryMainPlays = async () => {
  const target = canonicalAddNewTrackEveryMainPlays();
  try {
    await sql`
      UPDATE playback_settings
      SET add_new_track_every_nights = ${target}
      WHERE id = 1
        AND add_new_track_every_nights IS DISTINCT FROM ${target}
    `;
  } catch {
    // Table may not exist in some test / partial environments
  }
};

const ensureLibrarySeeded = async () => {
  try {
    await sql`ALTER TABLE library_items ADD COLUMN file_name text NOT NULL DEFAULT ''`;
  } catch {
    // Column already exists (e.g. after migration or new install)
  }
  const { rows } = await sql<{ count: number }>`
    SELECT COUNT(*)::int AS count FROM library_items
  `;
  if (rows[0]?.count) {
    return;
  }
  const seedItems = buildLibrarySeedFromAssets();
  if (seedItems.length === 0) {
    return;
  }
  await Promise.all(
    seedItems.map((item) =>
      sql`
        INSERT INTO library_items
          (title, description, sku_code, file_name, categories, cover_url, audio_url, interest_ids, allowed_user_emails, order_index, is_adult)
        VALUES
          (${item.title}, ${item.description}, ${item.skuCode || ""}, ${(item as { fileName?: string }).fileName ?? ""}, ${toPgArray(item.categories || [])}::text[],
           ${item.coverUrl}, ${item.audioUrl},
           ${toPgArray(item.interestIds)}::text[], ${toPgArray(item.allowedUserEmails)}::text[],
           ${item.order}, ${item.isAdult})
      `
    )
  );
};

export const listInterests = async (): Promise<Interest[]> => {
  await ensureInterestsSeeded();
  try {
    const { rows } = await sql<Interest & { audio_id_a?: string; audio_id_b?: string; audio_id_c?: string; is_adult?: boolean }>`
      SELECT id, name, description,
        audio_id_a as "audioIdA",
        audio_id_b as "audioIdB",
        audio_id_c as "audioIdC",
        COALESCE(is_adult, false) as "isAdult",
        COALESCE(categories, ARRAY[]::text[]) as "categories",
        created_at as "createdAt"
      FROM interests
      ORDER BY name ASC
    `;
    return rows.map((r) => ({
      ...r,
      description: r.description ?? undefined,
      isAdult: r.isAdult ?? false,
      categories: r.categories ?? []
    }));
  } catch {
    const { rows } = await sql<{ id: string; name: string; description: string | null; createdAt: string }>`
      SELECT id, name, description, created_at as "createdAt"
      FROM interests
      ORDER BY name ASC
    `;
    return rows.map((r) => ({
      ...r,
      description: r.description ?? undefined,
      audioIdA: null,
      audioIdB: null,
      audioIdC: null,
      isAdult: false,
      categories: [] as string[]
    }));
  }
};

export const updateInterest = async (
  id: string,
  name: string,
  description?: string,
  audioIds?: { a?: string | null; b?: string | null; c?: string | null },
  opts?: { isAdult?: boolean; categories?: string[] }
) => {
  const isAdult = opts?.isAdult ?? false;
  const categories = opts?.categories ?? [];
  try {
    if (audioIds !== undefined) {
      const { rows } = await sql<Interest>`
        UPDATE interests
        SET name = ${name},
            description = ${description || ""},
            audio_id_a = ${audioIds.a ?? null},
            audio_id_b = ${audioIds.b ?? null},
            audio_id_c = ${audioIds.c ?? null},
            is_adult = ${isAdult},
            categories = ${toPgArray(categories)}::text[]
        WHERE id = ${id}
        RETURNING id, name, description, created_at as "createdAt"
      `;
      if (rows[0]) return rows[0];
    } else {
      const { rows } = await sql<Interest>`
        UPDATE interests
        SET name = ${name},
            description = ${description || ""},
            is_adult = ${isAdult},
            categories = ${toPgArray(categories)}::text[]
        WHERE id = ${id}
        RETURNING id, name, description, created_at as "createdAt"
      `;
      if (rows[0]) return rows[0];
    }
  } catch {
    // is_adult/categories columns may not exist
  }
  if (audioIds !== undefined) {
    const { rows } = await sql<Interest>`
      UPDATE interests
      SET name = ${name},
          description = ${description || ""},
          audio_id_a = ${audioIds.a ?? null},
          audio_id_b = ${audioIds.b ?? null},
          audio_id_c = ${audioIds.c ?? null}
      WHERE id = ${id}
      RETURNING id, name, description, created_at as "createdAt"
    `;
    return rows[0] || null;
  }
  const { rows } = await sql<Interest>`
    UPDATE interests
    SET name = ${name}, description = ${description || ""}
    WHERE id = ${id}
    RETURNING id, name, description, created_at as "createdAt"
  `;
  return rows[0] || null;
};

export const createInterest = async (
  name: string,
  description?: string,
  opts?: { isAdult?: boolean; categories?: string[] }
) => {
  const id = crypto.randomUUID();
  const isAdult = opts?.isAdult ?? false;
  const categories = opts?.categories ?? [];
  try {
    const { rows } = await sql<Interest>`
      INSERT INTO interests (id, name, description, is_adult, categories, created_at)
      VALUES (${id}, ${name}, ${description || ""}, ${isAdult}, ${toPgArray(categories)}::text[], now())
      RETURNING id, name, description, created_at as "createdAt"
    `;
    return rows[0];
  } catch {
    const { rows } = await sql<Interest>`
      INSERT INTO interests (id, name, description, created_at)
      VALUES (${id}, ${name}, ${description || ""}, now())
      RETURNING id, name, description, created_at as "createdAt"
    `;
    return rows[0];
  }
};

export const deleteInterest = async (id: string) => {
  await sql`DELETE FROM interests WHERE id = ${id}`;
};

export const listLibrary = async () => {
  await ensureLibrarySeeded();
  const { rows } = await sql<LibraryItem>`
    SELECT
      id,
      title,
      description,
      sku_code as "skuCode",
      COALESCE(file_name, '') as "fileName",
      COALESCE(categories, ARRAY[]::text[]) as "categories",
      cover_url as "coverUrl",
      audio_url as "audioUrl",
      COALESCE(interest_ids, ARRAY[]::text[]) as "interestIds",
      COALESCE(allowed_user_emails, ARRAY[]::text[]) as "allowedUserEmails",
      moderator_id as "moderatorId",
      in_general_catalog as "inGeneralCatalog",
      created_at as "createdAt",
      order_index as "order",
      is_adult as "isAdult"
    FROM library_items
    ORDER BY LOWER(title) ASC
  `;
  return rows.map(normalizeLibrarySku);
};

export const listPersonalizedLibraryForUser = async (email: string) => {
  await ensureLibrarySeeded();
  const { rows } = await sql<LibraryItem>`
    SELECT
      id,
      title,
      description,
      sku_code as "skuCode",
      COALESCE(file_name, '') as "fileName",
      COALESCE(categories, ARRAY[]::text[]) as "categories",
      cover_url as "coverUrl",
      audio_url as "audioUrl",
      COALESCE(interest_ids, ARRAY[]::text[]) as "interestIds",
      COALESCE(allowed_user_emails, ARRAY[]::text[]) as "allowedUserEmails",
      moderator_id as "moderatorId",
      in_general_catalog as "inGeneralCatalog",
      created_at as "createdAt",
      order_index as "order",
      is_adult as "isAdult"
    FROM library_items
    WHERE allowed_user_emails IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM unnest(allowed_user_emails) AS allowed
        WHERE LOWER(allowed) = LOWER(${email})
      )
    ORDER BY LOWER(title) ASC
  `;
  return rows.map(normalizeLibrarySku);
};

export const listFacilitatorLibraryItems = async (moderatorId: string) => {
  await ensureLibrarySeeded();
  const { rows } = await sql<LibraryItem>`
    SELECT
      id,
      title,
      description,
      sku_code as "skuCode",
      COALESCE(file_name, '') as "fileName",
      COALESCE(categories, ARRAY[]::text[]) as "categories",
      cover_url as "coverUrl",
      audio_url as "audioUrl",
      COALESCE(interest_ids, ARRAY[]::text[]) as "interestIds",
      COALESCE(allowed_user_emails, ARRAY[]::text[]) as "allowedUserEmails",
      moderator_id as "moderatorId",
      in_general_catalog as "inGeneralCatalog",
      created_at as "createdAt",
      order_index as "order",
      is_adult as "isAdult"
    FROM library_items
    WHERE moderator_id = ${moderatorId}
    ORDER BY created_at DESC
  `;
  return rows.map(normalizeLibrarySku);
};

export const getLibraryItem = async (id: string) => {
  await ensureLibrarySeeded();
  const { rows } = await sql<LibraryItem>`
    SELECT
      id,
      title,
      description,
      sku_code as "skuCode",
      COALESCE(file_name, '') as "fileName",
      COALESCE(categories, ARRAY[]::text[]) as "categories",
      cover_url as "coverUrl",
      audio_url as "audioUrl",
      COALESCE(interest_ids, ARRAY[]::text[]) as "interestIds",
      COALESCE(allowed_user_emails, ARRAY[]::text[]) as "allowedUserEmails",
      moderator_id as "moderatorId",
      in_general_catalog as "inGeneralCatalog",
      created_at as "createdAt",
      order_index as "order",
      is_adult as "isAdult"
    FROM library_items
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ? normalizeLibrarySku(rows[0]) : null;
};

/** Returns the id of a library item that has this SKU, or null. Optional excludeId for updates. */
export const getLibraryItemIdBySkuCode = async (
  skuCode: string,
  excludeId?: string
): Promise<string | null> => {
  if (!skuCode || typeof skuCode !== "string" || !skuCode.trim()) {
    return null;
  }
  const trimmed = stripSkuHyphens(skuCode);
  if (!trimmed) {
    return null;
  }
  let rows: { id: string }[];
  if (excludeId) {
    const result = await sql<{ id: string }>`
      SELECT id FROM library_items
      WHERE REPLACE(TRIM(sku_code), '-', '') = ${trimmed} AND id != ${excludeId}
      LIMIT 1
    `;
    rows = result.rows;
  } else {
    const result = await sql<{ id: string }>`
      SELECT id FROM library_items
      WHERE REPLACE(TRIM(sku_code), '-', '') = ${trimmed}
      LIMIT 1
    `;
    rows = result.rows;
  }
  return rows[0]?.id ?? null;
};

/** Record one session use for a member (e.g. when they start a session on the console). */
export const recordSessionUsed = async (userId: string): Promise<void> => {
  try {
    await sql`
      INSERT INTO member_session_usage (user_id, used_at)
      VALUES (${userId}, now())
    `;
  } catch {
    // Table may not exist yet if schema not run; avoid breaking the member flow
  }
};

/** Get session usage counts per user for today (UTC) and last 7 days. */
export const getSessionUsageCountsByUser = async (): Promise<
  Map<string, { sessionsToday: number; sessionsLast7: number }>
> => {
  const map = new Map<string, { sessionsToday: number; sessionsLast7: number }>();
  try {
    const now = new Date();
    const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const startOfLast7Utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7)).toISOString();

    const { rows: todayRows } = await sql<{ user_id: string; count: string }>`
      SELECT user_id, COUNT(*)::text AS count
      FROM member_session_usage
      WHERE used_at >= ${startOfTodayUtc}
      GROUP BY user_id
    `;
    const { rows: last7Rows } = await sql<{ user_id: string; count: string }>`
      SELECT user_id, COUNT(*)::text AS count
      FROM member_session_usage
      WHERE used_at >= ${startOfLast7Utc}
      GROUP BY user_id
    `;

    for (const r of todayRows) {
      const count = parseInt(r.count, 10) || 0;
      const existing = map.get(r.user_id) || { sessionsToday: 0, sessionsLast7: 0 };
      map.set(r.user_id, { ...existing, sessionsToday: count });
    }
    for (const r of last7Rows) {
      const count = parseInt(r.count, 10) || 0;
      const existing = map.get(r.user_id) || { sessionsToday: 0, sessionsLast7: 0 };
      map.set(r.user_id, { ...existing, sessionsLast7: count });
    }
  } catch {
    // Table may not exist yet; return empty counts
  }
  return map;
};

/** Total (lifetime) session count per user. */
export const getTotalSessionCountByUser = async (): Promise<Map<string, number>> => {
  const map = new Map<string, number>();
  try {
    const { rows } = await sql<{ user_id: string; count: string }>`
      SELECT user_id, COUNT(*)::text AS count
      FROM member_session_usage
      GROUP BY user_id
    `;
    for (const r of rows) {
      map.set(r.user_id, parseInt(r.count, 10) || 0);
    }
  } catch {
    // Table may not exist
  }
  return map;
};

export type MemberActivityLogRow = {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  action: string;
  details: string | null;
  createdAt: string;
};

/** Record a member action (login or console activity). */
export const recordMemberActivity = async (
  userId: string,
  action: string,
  details?: string | null
): Promise<void> => {
  try {
    await sql`
      INSERT INTO member_activity_log (user_id, action, details)
      VALUES (${userId}, ${action}, ${details ?? null})
    `;
  } catch {
    // Table may not exist yet
  }
};

export type MemberActivityLogEntry = {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
};

/** Recent activity rows for a single member (admin member detail view). */
export const getMemberActivityLogForUser = async (
  userId: string,
  limit: number = 150
): Promise<MemberActivityLogEntry[]> => {
  try {
    const { rows } = await sql<{
      id: string;
      action: string;
      details: string | null;
      created_at: string;
    }>`
      SELECT id, action, details, created_at
      FROM member_activity_log
      WHERE user_id = ${userId}
      ORDER BY created_at DESC NULLS LAST, id DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => {
      const ca = r.created_at as unknown;
      const createdAt =
        ca instanceof Date
          ? ca.toISOString()
          : typeof r.created_at === "string"
            ? r.created_at
            : String(r.created_at);
      return {
        id: r.id,
        action: r.action,
        details: r.details ?? null,
        createdAt
      };
    });
  } catch {
    return [];
  }
};

/** Audio start + outcome rows for member listen progress reports. */
export const getMemberAudioActivityForListenProgress = async (
  userId: string,
  limit: number = 2500
): Promise<MemberActivityLogEntry[]> => {
  const capped = Math.max(1, Math.min(5000, Math.floor(limit)));
  try {
    const { rows } = await sql<{
      id: string;
      action: string;
      details: string | null;
      created_at: string;
    }>`
      SELECT id, action, details, created_at
      FROM member_activity_log
      WHERE user_id = ${userId}
        AND action IN ('played_audio', 'audio_playback_outcome')
      ORDER BY created_at DESC NULLS LAST, id DESC
      LIMIT ${capped}
    `;
    return rows.map((r) => {
      const ca = r.created_at as unknown;
      const createdAt =
        ca instanceof Date
          ? ca.toISOString()
          : typeof r.created_at === "string"
            ? r.created_at
            : String(r.created_at);
      return {
        id: r.id,
        action: r.action,
        details: r.details ?? null,
        createdAt
      };
    });
  } catch {
    return [];
  }
};

/** Get recent member activity for admin (with user name/email). */
export const getMemberActivityLog = async (limit: number = 100): Promise<MemberActivityLogRow[]> => {
  try {
    const { rows } = await sql<{
      id: string;
      user_id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
      action: string;
      details: string | null;
      created_at: string;
    }>`
      SELECT
        m.id,
        m.user_id,
        u.email,
        mp.first_name,
        mp.last_name,
        m.action,
        m.details,
        m.created_at
      FROM member_activity_log m
      JOIN users u ON u.id = m.user_id
      LEFT JOIN member_profiles mp ON mp.user_id = m.user_id
      ORDER BY m.created_at DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      email: r.email,
      firstName: r.first_name ?? null,
      lastName: r.last_name ?? null,
      action: r.action,
      details: r.details ?? null,
      createdAt: r.created_at
    }));
  } catch {
    return [];
  }
};

export type MemberIssueReportStatus = "open" | "in_progress" | "resolved" | "closed";

export type MemberIssueReportAdmin = {
  id: string;
  /** Null when an admin filed an internal ticket (no member account). */
  userId: string | null;
  memberEmail: string;
  category: string;
  subject: string;
  message: string;
  screenshotUrl: string | null;
  attachmentUrls: string[];
  status: string;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
};

/** Admin-filed tickets have no member user_id; resolution emails should not go to the reporter as a "member". */
export const isAdminFiledIssueReport = (
  report: Pick<MemberIssueReportAdmin, "userId"> | { userId?: string | null }
): boolean => !report.userId;

export const insertMemberIssueReport = async (params: {
  userId: string | null;
  memberEmail: string;
  category: string;
  subject: string;
  message: string;
  screenshotUrl?: string | null;
  attachmentUrls?: string[];
}): Promise<boolean> => {
  const attachmentUrls = (params.attachmentUrls ?? []).map((url) => url.trim()).filter(Boolean);
  const screenshotUrl = params.screenshotUrl?.trim() || attachmentUrls[0] || null;
  const userId = params.userId?.trim() || null;
  try {
    await sql`
      INSERT INTO member_issue_reports (user_id, member_email, category, subject, message, screenshot_url, attachment_urls)
      VALUES (
        ${userId},
        ${params.memberEmail},
        ${params.category},
        ${params.subject},
        ${params.message},
        ${screenshotUrl},
        ${toPgArray(attachmentUrls)}::text[]
      )
    `;
    return true;
  } catch (err) {
    if (isMissingAttachmentUrlsColumn(err)) {
      try {
        await sql`
          INSERT INTO member_issue_reports (user_id, member_email, category, subject, message, screenshot_url)
          VALUES (
            ${userId},
            ${params.memberEmail},
            ${params.category},
            ${params.subject},
            ${params.message},
            ${screenshotUrl}
          )
        `;
        return true;
      } catch (fallbackErr) {
        if (isMissingScreenshotColumn(fallbackErr)) {
          try {
            await sql`
              INSERT INTO member_issue_reports (user_id, member_email, category, subject, message)
              VALUES (
                ${userId},
                ${params.memberEmail},
                ${params.category},
                ${params.subject},
                ${params.message}
              )
            `;
            return true;
          } catch (innerErr) {
            logMemberIssueReportsQueryError("insert fallback without screenshot", innerErr);
            return false;
          }
        }
        logMemberIssueReportsQueryError("insert fallback without attachment_urls", fallbackErr);
        return false;
      }
    }
    if (isMissingScreenshotColumn(err)) {
      try {
        await sql`
          INSERT INTO member_issue_reports (user_id, member_email, category, subject, message)
          VALUES (
            ${userId},
            ${params.memberEmail},
            ${params.category},
            ${params.subject},
            ${params.message}
          )
        `;
        return true;
      } catch (fallbackErr) {
        logMemberIssueReportsQueryError("insert fallback", fallbackErr);
        return false;
      }
    }
    logMemberIssueReportsQueryError("insert", err);
    return false;
  }
};

const mapIssueReportRow = (r: {
  id: string;
  user_id: string | null;
  member_email: string;
  category: string;
  subject: string;
  message: string;
  screenshot_url?: string | null;
  attachment_urls?: string[] | null;
  status: string;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}): MemberIssueReportAdmin => {
  const attachmentUrls = resolveReportIssueAttachmentUrls(r.attachment_urls, r.screenshot_url);
  return {
    id: r.id,
    userId: r.user_id || null,
    memberEmail: r.member_email,
    category: r.category,
    subject: r.subject,
    message: r.message,
    screenshotUrl: r.screenshot_url ?? attachmentUrls[0] ?? null,
    attachmentUrls,
    status: r.status,
    resolutionNotes: r.resolution_notes ?? null,
    resolvedAt: r.resolved_at ?? null,
    resolvedBy: r.resolved_by ?? null,
    createdAt: r.created_at
  };
};

type MemberIssueReportRow = {
  id: string;
  user_id: string | null;
  member_email: string;
  category: string;
  subject: string;
  message: string;
  screenshot_url?: string | null;
  attachment_urls?: string[] | null;
  status: string;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
};

function isMissingScreenshotColumn(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /screenshot_url/i.test(msg) && /does not exist|column/i.test(msg);
}

function isMissingAttachmentUrlsColumn(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /attachment_urls/i.test(msg) && /does not exist|column/i.test(msg);
}

function isMissingIssueReportMediaColumn(err: unknown): boolean {
  return isMissingScreenshotColumn(err) || isMissingAttachmentUrlsColumn(err);
}

function logMemberIssueReportsQueryError(label: string, err: unknown): void {
  console.error(`[member_issue_reports] ${label}`, err);
}

export const listMemberIssueReportsForMemberEmails = async (
  emails: string[],
  limit = 50
): Promise<MemberIssueReportAdmin[]> => {
  const unique = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (!unique.length) return [];
  try {
    const { rows } = await sql<MemberIssueReportRow & { status: MemberIssueReportStatus }>`
      SELECT
        id,
        user_id,
        member_email,
        category,
        subject,
        message,
        screenshot_url,
        attachment_urls,
        status,
        resolution_notes,
        resolved_at,
        resolved_by,
        created_at
      FROM member_issue_reports
      WHERE LOWER(member_email) = ANY(${toPgArray(unique)}::text[])
        AND status IN ('open', 'in_progress')
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => mapIssueReportRow(r));
  } catch (err) {
    if (isMissingIssueReportMediaColumn(err)) {
      try {
        const { rows } = await sql<MemberIssueReportRow & { status: MemberIssueReportStatus }>`
          SELECT
            id,
            user_id,
            member_email,
            category,
            subject,
            message,
            screenshot_url,
            status,
            resolution_notes,
            resolved_at,
            resolved_by,
            created_at
          FROM member_issue_reports
          WHERE LOWER(member_email) = ANY(${toPgArray(unique)}::text[])
            AND status IN ('open', 'in_progress')
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;
        return rows.map((r) => mapIssueReportRow(r));
      } catch (fallbackErr) {
        if (isMissingScreenshotColumn(fallbackErr)) {
          try {
            const { rows } = await sql<MemberIssueReportRow & { status: MemberIssueReportStatus }>`
              SELECT
                id,
                user_id,
                member_email,
                category,
                subject,
                message,
                status,
                resolution_notes,
                resolved_at,
                resolved_by,
                created_at
              FROM member_issue_reports
              WHERE LOWER(member_email) = ANY(${toPgArray(unique)}::text[])
                AND status IN ('open', 'in_progress')
              ORDER BY created_at DESC
              LIMIT ${limit}
            `;
            return rows.map((r) => mapIssueReportRow(r));
          } catch (innerErr) {
            logMemberIssueReportsQueryError("list for member emails fallback without screenshot", innerErr);
            return [];
          }
        }
        logMemberIssueReportsQueryError("list for member emails fallback", fallbackErr);
        return [];
      }
    }
    logMemberIssueReportsQueryError("list for member emails", err);
    return [];
  }
};

export const countMemberIssueReports = async (
  statusFilter: "all" | MemberIssueReportStatus
): Promise<{ count: number; queryFailed: boolean }> => {
  try {
    if (statusFilter === "all") {
      const { rows } = await sql<{ c: string }>`
        SELECT COUNT(*)::text AS c FROM member_issue_reports
      `;
      return { count: parseInt(rows[0]?.c || "0", 10) || 0, queryFailed: false };
    }
    const { rows } = await sql<{ c: string }>`
      SELECT COUNT(*)::text AS c
      FROM member_issue_reports
      WHERE status = ${statusFilter}
    `;
    return { count: parseInt(rows[0]?.c || "0", 10) || 0, queryFailed: false };
  } catch (err) {
    logMemberIssueReportsQueryError("count", err);
    return { count: 0, queryFailed: true };
  }
};

export const listMemberIssueReportsAdminPaged = async (params: {
  page: number;
  pageSize: number;
  statusFilter: "all" | MemberIssueReportStatus;
}): Promise<{ reports: MemberIssueReportAdmin[]; queryFailed: boolean }> => {
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize)));
  const page = Math.max(1, Math.floor(params.page));
  const offset = (page - 1) * pageSize;

  const runList = async (mode: "full" | "screenshot" | "none") => {
    if (mode === "full" || mode === "screenshot") {
      if (params.statusFilter === "all") {
        return mode === "full"
          ? sql<MemberIssueReportRow>`
              SELECT
                id,
                user_id,
                member_email,
                category,
                subject,
                message,
                screenshot_url,
                attachment_urls,
                status,
                resolution_notes,
                resolved_at,
                resolved_by,
                created_at
              FROM member_issue_reports
              ORDER BY created_at DESC
              LIMIT ${pageSize}
              OFFSET ${offset}
            `
          : sql<MemberIssueReportRow>`
              SELECT
                id,
                user_id,
                member_email,
                category,
                subject,
                message,
                screenshot_url,
                status,
                resolution_notes,
                resolved_at,
                resolved_by,
                created_at
              FROM member_issue_reports
              ORDER BY created_at DESC
              LIMIT ${pageSize}
              OFFSET ${offset}
            `;
      }
      return mode === "full"
        ? sql<MemberIssueReportRow>`
            SELECT
              id,
              user_id,
              member_email,
              category,
              subject,
              message,
              screenshot_url,
              attachment_urls,
              status,
              resolution_notes,
              resolved_at,
              resolved_by,
              created_at
            FROM member_issue_reports
            WHERE status = ${params.statusFilter}
            ORDER BY created_at DESC
            LIMIT ${pageSize}
            OFFSET ${offset}
          `
        : sql<MemberIssueReportRow>`
            SELECT
              id,
              user_id,
              member_email,
              category,
              subject,
              message,
              screenshot_url,
              status,
              resolution_notes,
              resolved_at,
              resolved_by,
              created_at
            FROM member_issue_reports
            WHERE status = ${params.statusFilter}
            ORDER BY created_at DESC
            LIMIT ${pageSize}
            OFFSET ${offset}
          `;
    }
    if (params.statusFilter === "all") {
      return sql<MemberIssueReportRow>`
        SELECT
          id,
          user_id,
          member_email,
          category,
          subject,
          message,
          status,
          resolution_notes,
          resolved_at,
          resolved_by,
          created_at
        FROM member_issue_reports
        ORDER BY created_at DESC
        LIMIT ${pageSize}
        OFFSET ${offset}
      `;
    }
    return sql<MemberIssueReportRow>`
      SELECT
        id,
        user_id,
        member_email,
        category,
        subject,
        message,
        status,
        resolution_notes,
        resolved_at,
        resolved_by,
        created_at
      FROM member_issue_reports
      WHERE status = ${params.statusFilter}
      ORDER BY created_at DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `;
  };

  try {
    const { rows } = await runList("full");
    return { reports: rows.map(mapIssueReportRow), queryFailed: false };
  } catch (err) {
    if (isMissingAttachmentUrlsColumn(err)) {
      try {
        const { rows } = await runList("screenshot");
        return { reports: rows.map(mapIssueReportRow), queryFailed: false };
      } catch (fallbackErr) {
        if (isMissingScreenshotColumn(fallbackErr)) {
          try {
            const { rows } = await runList("none");
            return { reports: rows.map(mapIssueReportRow), queryFailed: false };
          } catch (innerErr) {
            logMemberIssueReportsQueryError("list admin paged fallback without screenshot", innerErr);
            return { reports: [], queryFailed: true };
          }
        }
        logMemberIssueReportsQueryError("list admin paged fallback without attachment_urls", fallbackErr);
        return { reports: [], queryFailed: true };
      }
    }
    if (isMissingScreenshotColumn(err)) {
      try {
        const { rows } = await runList("none");
        return { reports: rows.map(mapIssueReportRow), queryFailed: false };
      } catch (fallbackErr) {
        logMemberIssueReportsQueryError("list admin paged fallback", fallbackErr);
        return { reports: [], queryFailed: true };
      }
    }
    logMemberIssueReportsQueryError("list admin paged", err);
    return { reports: [], queryFailed: true };
  }
};

export const getMemberIssueReportById = async (
  reportId: string
): Promise<MemberIssueReportAdmin | null> => {
  const runGet = (mode: "full" | "screenshot" | "none") => {
    if (mode === "full") {
      return sql<MemberIssueReportRow>`
        SELECT
          id,
          user_id,
          member_email,
          category,
          subject,
          message,
          screenshot_url,
          attachment_urls,
          status,
          resolution_notes,
          resolved_at,
          resolved_by,
          created_at
        FROM member_issue_reports
        WHERE id = ${reportId}::uuid
        LIMIT 1
      `;
    }
    if (mode === "screenshot") {
      return sql<MemberIssueReportRow>`
        SELECT
          id,
          user_id,
          member_email,
          category,
          subject,
          message,
          screenshot_url,
          status,
          resolution_notes,
          resolved_at,
          resolved_by,
          created_at
        FROM member_issue_reports
        WHERE id = ${reportId}::uuid
        LIMIT 1
      `;
    }
    return sql<MemberIssueReportRow>`
      SELECT
        id,
        user_id,
        member_email,
        category,
        subject,
        message,
        status,
        resolution_notes,
        resolved_at,
        resolved_by,
        created_at
      FROM member_issue_reports
      WHERE id = ${reportId}::uuid
      LIMIT 1
    `;
  };

  try {
    const { rows } = await runGet("full");
    const r = rows[0];
    return r ? mapIssueReportRow(r) : null;
  } catch (err) {
    if (isMissingAttachmentUrlsColumn(err)) {
      try {
        const { rows } = await runGet("screenshot");
        const r = rows[0];
        return r ? mapIssueReportRow(r) : null;
      } catch (fallbackErr) {
        if (isMissingScreenshotColumn(fallbackErr)) {
          try {
            const { rows } = await runGet("none");
            const r = rows[0];
            return r ? mapIssueReportRow(r) : null;
          } catch (innerErr) {
            logMemberIssueReportsQueryError("get by id fallback without screenshot", innerErr);
            return null;
          }
        }
        logMemberIssueReportsQueryError("get by id fallback without attachment_urls", fallbackErr);
        return null;
      }
    }
    if (isMissingScreenshotColumn(err)) {
      try {
        const { rows } = await runGet("none");
        const r = rows[0];
        return r ? mapIssueReportRow(r) : null;
      } catch (fallbackErr) {
        logMemberIssueReportsQueryError("get by id fallback", fallbackErr);
        return null;
      }
    }
    logMemberIssueReportsQueryError("get by id", err);
    return null;
  }
};

export const updateMemberIssueReportAdmin = async (
  reportId: string,
  input: {
    status: MemberIssueReportStatus;
    /** Omit to leave existing resolution text unchanged. */
    resolutionNotes?: string | null;
    resolvedByEmail: string | null;
  }
): Promise<{ ok: true } | { ok: false; error: string }> => {
  const terminal = input.status === "resolved" || input.status === "closed";
  const resolvedAt = terminal ? new Date().toISOString() : null;
  const resolvedBy = terminal ? input.resolvedByEmail : null;
  try {
    let rowCount: number | null | undefined;
    if (input.resolutionNotes === undefined) {
      const r = await sql`
        UPDATE member_issue_reports
        SET
          status = ${input.status},
          resolved_at = ${resolvedAt},
          resolved_by = ${resolvedBy}
        WHERE id = ${reportId}::uuid
      `;
      rowCount = r.rowCount;
    } else {
      const r = await sql`
        UPDATE member_issue_reports
        SET
          status = ${input.status},
          resolution_notes = ${input.resolutionNotes},
          resolved_at = ${resolvedAt},
          resolved_by = ${resolvedBy}
        WHERE id = ${reportId}::uuid
      `;
      rowCount = r.rowCount;
    }
    if ((rowCount ?? 0) < 1) {
      return { ok: false, error: "Report not found." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not update report." };
  }
};

export const createLibraryItem = async (payload: {
  title: string;
  description: string;
  skuCode: string;
  fileName?: string;
  categories: string[];
  coverUrl: string;
  audioUrl: string;
  interestIds: string[];
  allowedUserEmails: string[];
  isAdult?: boolean;
  moderatorId?: string | null;
  inGeneralCatalog?: boolean;
}) => {
  const { rows: orderRows } = await sql<{ max: number }>`
    SELECT COALESCE(MAX(order_index), 0)::int as max FROM library_items
  `;
  const order = (orderRows[0]?.max || 0) + 1;
  const inCatalog = payload.inGeneralCatalog ?? (payload.moderatorId ? false : true);
  const skuCode = stripSkuHyphens(payload.skuCode || "");
  const { rows } = await sql<LibraryItem>`
    INSERT INTO library_items
      (title, description, sku_code, file_name, categories, cover_url, audio_url, interest_ids, allowed_user_emails, order_index, is_adult, moderator_id, in_general_catalog)
    VALUES
      (${payload.title}, ${payload.description}, ${skuCode}, ${payload.fileName ?? ""}, ${toPgArray(payload.categories)}::text[],
       ${payload.coverUrl}, ${payload.audioUrl},
       ${toPgArray(payload.interestIds)}::text[], ${toPgArray(payload.allowedUserEmails)}::text[],
       ${order}, ${payload.isAdult ?? false}, ${payload.moderatorId ?? null}, ${inCatalog})
    RETURNING
      id,
      title,
      description,
      sku_code as "skuCode",
      COALESCE(file_name, '') as "fileName",
      COALESCE(categories, ARRAY[]::text[]) as "categories",
      cover_url as "coverUrl",
      audio_url as "audioUrl",
      COALESCE(interest_ids, ARRAY[]::text[]) as "interestIds",
      COALESCE(allowed_user_emails, ARRAY[]::text[]) as "allowedUserEmails",
      moderator_id as "moderatorId",
      in_general_catalog as "inGeneralCatalog",
      created_at as "createdAt",
      order_index as "order",
      is_adult as "isAdult"
  `;
  return normalizeLibrarySku(rows[0]);
};

export const updateLibraryItem = async (payload: {
  id: string;
  title: string;
  description: string;
  skuCode: string;
  fileName?: string;
  categories: string[];
  coverUrl: string;
  audioUrl: string;
  interestIds: string[];
  allowedUserEmails: string[];
  order?: number;
  isAdult?: boolean;
  inGeneralCatalog?: boolean;
}) => {
  const skuCode = stripSkuHyphens(payload.skuCode || "");
  const { rows } = await sql<LibraryItem>`
    UPDATE library_items
    SET
      title = ${payload.title},
      description = ${payload.description},
      sku_code = ${skuCode},
      file_name = ${payload.fileName ?? ""},
      categories = ${toPgArray(payload.categories)}::text[],
      cover_url = ${payload.coverUrl},
      audio_url = ${payload.audioUrl},
      interest_ids = ${toPgArray(payload.interestIds)}::text[],
      allowed_user_emails = ${toPgArray(payload.allowedUserEmails)}::text[],
      order_index = COALESCE(${payload.order ?? null}, order_index),
      is_adult = COALESCE(${payload.isAdult ?? null}, is_adult),
      in_general_catalog = COALESCE(${payload.inGeneralCatalog ?? null}, in_general_catalog)
    WHERE id = ${payload.id}
    RETURNING
      id,
      title,
      description,
      sku_code as "skuCode",
      COALESCE(file_name, '') as "fileName",
      COALESCE(categories, ARRAY[]::text[]) as "categories",
      cover_url as "coverUrl",
      audio_url as "audioUrl",
      COALESCE(interest_ids, ARRAY[]::text[]) as "interestIds",
      COALESCE(allowed_user_emails, ARRAY[]::text[]) as "allowedUserEmails",
      moderator_id as "moderatorId",
      in_general_catalog as "inGeneralCatalog",
      created_at as "createdAt",
      order_index as "order",
      is_adult as "isAdult"
  `;
  return rows[0] ? normalizeLibrarySku(rows[0]) : null;
};

export const reorderLibraryItems = async (orderedIds: string[]) => {
  await Promise.all(
    orderedIds.map((id, index) =>
      sql`UPDATE library_items SET order_index = ${index + 1} WHERE id = ${id}`
    )
  );
};

export const deleteLibraryItem = async (id: string) => {
  await sql`DELETE FROM library_items WHERE id = ${id}`;
};

/** Append email to a library item's allowed_user_emails if not already present (case-insensitive). */
export const addEmailToLibraryItemAllowedList = async (
  libraryItemId: string,
  email: string
): Promise<boolean> => {
  await ensureLibrarySeeded();
  const emailLower = email.trim().toLowerCase();
  if (!emailLower) return false;
  const { rowCount } = await sql`
    UPDATE library_items
    SET allowed_user_emails = array_append(COALESCE(allowed_user_emails, ARRAY[]::text[]), ${emailLower})
    WHERE id = ${libraryItemId}
      AND NOT EXISTS (
        SELECT 1 FROM unnest(COALESCE(allowed_user_emails, ARRAY[]::text[])) AS e
        WHERE LOWER(e) = ${emailLower}
      )
  `;
  return (rowCount ?? 0) > 0;
};

/** Remove email from a library item's allowed_user_emails (case-insensitive). */
export const removeEmailFromLibraryItemAllowedList = async (
  libraryItemId: string,
  email: string
): Promise<boolean> => {
  await ensureLibrarySeeded();
  const emailLower = email.trim().toLowerCase();
  if (!emailLower) return false;
  const { rowCount } = await sql`
    UPDATE library_items
    SET allowed_user_emails = COALESCE((
      SELECT array_agg(e)
      FROM unnest(COALESCE(allowed_user_emails, ARRAY[]::text[])) AS e
      WHERE LOWER(e) <> ${emailLower}
    ), ARRAY[]::text[])
    WHERE id = ${libraryItemId}
  `;
  return (rowCount ?? 0) > 0;
};

/**
 * Keep only keepLibraryItemId as this member's CGMR allow-list entry.
 * Removes the member email from other CGMR items (does not delete library rows).
 */
export const revokeOtherMemberCgmrAllowListEntries = async (
  memberEmail: string,
  keepLibraryItemId: string
): Promise<number> => {
  await ensureLibrarySeeded();
  const emailLower = memberEmail.trim().toLowerCase();
  if (!emailLower || !keepLibraryItemId) return 0;
  const { rows } = await sql<{ id: string }>`
    SELECT id
    FROM library_items
    WHERE id <> ${keepLibraryItemId}
      AND EXISTS (
        SELECT 1 FROM unnest(COALESCE(categories, ARRAY[]::text[])) AS c
        WHERE LOWER(c) = 'cgmr'
      )
      AND EXISTS (
        SELECT 1 FROM unnest(COALESCE(allowed_user_emails, ARRAY[]::text[])) AS e
        WHERE LOWER(e) = ${emailLower}
      )
  `;
  let n = 0;
  for (const row of rows) {
    if (await removeEmailFromLibraryItemAllowedList(row.id, emailLower)) n += 1;
  }
  try {
    await sql`
      DELETE FROM member_audio_assignments
      WHERE LOWER(user_email) = ${emailLower}
        AND library_item_id <> ${keepLibraryItemId}
        AND library_item_id IN (
          SELECT id FROM library_items
          WHERE EXISTS (
            SELECT 1 FROM unnest(COALESCE(categories, ARRAY[]::text[])) AS c
            WHERE LOWER(c) = 'cgmr'
          )
        )
    `;
  } catch {
    // assignments table may be absent in some envs
  }
  return n;
};

/** Get the ordered list of library item IDs assigned to a member (for managed members). */
export const getMemberAudioOrder = async (email: string): Promise<string[]> => {
  try {
    const emailLower = email.toLowerCase();
    const { rows } = await sql<{ library_item_id: string }>`
      SELECT library_item_id
      FROM member_audio_assignments
      WHERE user_email = ${emailLower}
      ORDER BY assignment_order ASC
    `;
    return rows.map((row) => row.library_item_id);
  } catch (error: any) {
    // If table doesn't exist, return empty array
    if (error?.code === "42P01") {
      return [];
    }
    console.error("Error loading member audio order:", error);
    return [];
  }
};

export const listAffiliates = async () => {
  const { rows } = await sql<AffiliateRecord>`
    SELECT
      id,
      name,
      email,
      payout_address as "payoutAddress",
      created_at as "createdAt",
      status,
      affiliate_code as "affiliateCode",
      user_id as "userId",
      payout_method as "payoutMethod"
    FROM affiliate_applications
    ORDER BY created_at DESC
  `;
  return rows;
};

const ensureAffiliateApplicationCode = async (applicationId: string): Promise<string | null> => {
  const { rows } = await sql<{ affiliate_code: string | null }>`
    SELECT affiliate_code FROM affiliate_applications WHERE id = ${applicationId} LIMIT 1
  `;
  const current = rows[0]?.affiliate_code?.trim();
  if (current) return current.toUpperCase();

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateAffiliateCode();
    try {
      const { rows: updated } = await sql<{ affiliate_code: string }>`
        UPDATE affiliate_applications
        SET affiliate_code = ${code}
        WHERE id = ${applicationId} AND affiliate_code IS NULL
        RETURNING affiliate_code
      `;
      if (updated[0]?.affiliate_code) return updated[0].affiliate_code;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  return null;
};

const linkAffiliateApplicationToUserByEmail = async (email: string) => {
  const canonical = normalizeMemberEmail(email);
  const { rows: userRows } = await sql<{ id: string; affiliate_code: string | null }>`
    SELECT id, affiliate_code FROM users WHERE LOWER(email) = LOWER(${canonical}) LIMIT 1
  `;
  const user = userRows[0];
  if (!user) return;

  const { rows: appRows } = await sql<{ id: string; affiliate_code: string | null }>`
    SELECT id, affiliate_code
    FROM affiliate_applications
    WHERE LOWER(email) = LOWER(${canonical}) AND status = 'approved'
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const app = appRows[0];
  if (!app) return;

  await sql`UPDATE affiliate_applications SET user_id = ${user.id} WHERE id = ${app.id}`;

  if (app.affiliate_code?.trim()) {
    const appCode = app.affiliate_code.trim().toUpperCase();
    await sql`UPDATE users SET affiliate_code = ${appCode} WHERE id = ${user.id}`;
  } else if (user.affiliate_code?.trim()) {
    await sql`UPDATE affiliate_applications SET affiliate_code = ${user.affiliate_code} WHERE id = ${app.id}`;
  } else {
    const code = await ensureUserAffiliateCode(user.id);
    await sql`UPDATE affiliate_applications SET affiliate_code = ${code} WHERE id = ${app.id}`;
  }
};

export const createAffiliate = async (payload: {
  name: string;
  email: string;
  payoutMethod: string;
  payoutDetail: string | null;
}) => {
  const payoutDetail = payload.payoutDetail?.trim() || null;
  const { rows } = await sql<AffiliateRecord>`
    INSERT INTO affiliate_applications (name, email, payout_address, payout_method, status)
    VALUES (${payload.name}, ${payload.email}, ${payoutDetail || null}, ${payload.payoutMethod}, 'pending')
    RETURNING
      id,
      name,
      email,
      payout_address as "payoutAddress",
      created_at as "createdAt",
      status,
      affiliate_code as "affiliateCode",
      user_id as "userId",
      payout_method as "payoutMethod"
  `;
  return rows[0];
};

export const updateAffiliateStatus = async (id: string, status: AffiliateRecord["status"]) => {
  const { rows } = await sql<AffiliateRecord>`
    UPDATE affiliate_applications
    SET status = ${status}
    WHERE id = ${id}
    RETURNING
      id,
      name,
      email,
      payout_address as "payoutAddress",
      created_at as "createdAt",
      status,
      affiliate_code as "affiliateCode",
      user_id as "userId",
      payout_method as "payoutMethod"
  `;
  const record = rows[0] || null;
  if (!record) return null;

  if (status === "approved") {
    await ensureAffiliateApplicationCode(id);
    await linkAffiliateApplicationToUserByEmail(record.email);
    const { rows: refreshed } = await sql<AffiliateRecord>`
      SELECT
        id,
        name,
        email,
        payout_address as "payoutAddress",
        created_at as "createdAt",
        status,
        affiliate_code as "affiliateCode",
        user_id as "userId",
        payout_method as "payoutMethod"
      FROM affiliate_applications
      WHERE id = ${id}
      LIMIT 1
    `;
    return refreshed[0] || record;
  }

  return record;
};

export const listModerationQueue = async () => {
  const { rows } = await sql<ModerationItem>`
    SELECT
      id,
      title,
      creator,
      submitted_at as "submittedAt",
      status,
      notes
    FROM moderation_queue
    ORDER BY submitted_at DESC
  `;
  return rows;
};

export const createModerationItem = async (payload: { title: string; creator: string }) => {
  const { rows } = await sql<ModerationItem>`
    INSERT INTO moderation_queue (title, creator, status)
    VALUES (${payload.title}, ${payload.creator}, 'pending')
    RETURNING
      id,
      title,
      creator,
      submitted_at as "submittedAt",
      status,
      notes
  `;
  return rows[0];
};

export const updateModerationItem = async (payload: {
  id: string;
  status: ModerationItem["status"];
  notes?: string;
}) => {
  const { rows } = await sql<ModerationItem>`
    UPDATE moderation_queue
    SET status = ${payload.status}, notes = ${payload.notes || null}
    WHERE id = ${payload.id}
    RETURNING
      id,
      title,
      creator,
      submitted_at as "submittedAt",
      status,
      notes
  `;
  return rows[0] || null;
};

export const listModeratorApplications = async () => {
  const { rows } = await sql<ModeratorApplication>`
    SELECT
      id,
      name,
      email,
      focus_areas as "focusAreas",
      experience,
      links,
      phone,
      website,
      social_links as "socialLinks",
      photo_url as "photoUrl",
      profile_slug as "profileSlug",
      submitted_at as "submittedAt",
      status
    FROM moderator_applications
    ORDER BY submitted_at DESC
  `;
  return rows;
};

export const clearModeratorData = async () => {
  await sql`DELETE FROM moderators`;
  await sql`DELETE FROM moderator_applications`;
};

export const deletePendingModeratorApplications = async () => {
  await sql`DELETE FROM moderator_applications WHERE status != 'approved'`;
};

export const deleteModerator = async (moderatorId: string) => {
  const { rows } = await sql<{ email: string }>`
    SELECT email FROM moderators WHERE id = ${moderatorId}
  `;
  const email = rows[0]?.email;
  await sql`DELETE FROM moderators WHERE id = ${moderatorId}`;
  if (email) {
    await sql`DELETE FROM moderator_applications WHERE LOWER(email) = LOWER(${email})`;
  }
};

/** Remove approved application rows whose facilitator account was deleted. */
export const pruneOrphanedModeratorApplications = async () => {
  await sql`
    DELETE FROM moderator_applications ma
    WHERE ma.status = 'approved'
      AND NOT EXISTS (
        SELECT 1 FROM moderators m WHERE LOWER(m.email) = LOWER(ma.email)
      )
  `;
};

export const createModeratorApplication = async (payload: {
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
  status?: ModeratorApplication["status"];
}) => {
  const { rows } = await sql<ModeratorApplication>`
    INSERT INTO moderator_applications
      (name, email, focus_areas, experience, links, phone, website, social_links, photo_url, profile_slug, status)
    VALUES
      (${payload.name}, ${payload.email}, ${payload.focusAreas}, ${payload.experience},
       ${payload.links || ""}, ${payload.phone || ""}, ${payload.website || ""},
       ${payload.socialLinks || ""}, ${payload.photoUrl || ""}, ${payload.profileSlug || ""},
       ${payload.status || "pending"})
    ON CONFLICT (email)
    DO UPDATE SET
      name = EXCLUDED.name,
      focus_areas = EXCLUDED.focus_areas,
      experience = EXCLUDED.experience,
      links = EXCLUDED.links,
      phone = EXCLUDED.phone,
      website = EXCLUDED.website,
      social_links = EXCLUDED.social_links,
      photo_url = EXCLUDED.photo_url,
      profile_slug = EXCLUDED.profile_slug,
      status = CASE
        WHEN moderator_applications.status = 'approved' THEN moderator_applications.status
        ELSE EXCLUDED.status
      END,
      submitted_at = now()
    RETURNING
      id,
      name,
      email,
      focus_areas as "focusAreas",
      experience,
      links,
      phone,
      website,
      social_links as "socialLinks",
      photo_url as "photoUrl",
      profile_slug as "profileSlug",
      submitted_at as "submittedAt",
      status
  `;
  return rows[0];
};

export const updateModeratorApplicationStatus = async (
  id: string,
  status: ModeratorApplication["status"]
) => {
  const { rows } = await sql<ModeratorApplication>`
    UPDATE moderator_applications
    SET status = ${status}
    WHERE id = ${id}
    RETURNING
      id,
      name,
      email,
      focus_areas as "focusAreas",
      experience,
      links,
      phone,
      website,
      social_links as "socialLinks",
      photo_url as "photoUrl",
      profile_slug as "profileSlug",
      submitted_at as "submittedAt",
      status
  `;
  return rows[0] || null;
};

export const updateModeratorApplication = async (payload: {
  id: string;
  name?: string;
  email?: string;
  focusAreas?: string;
  experience?: string;
  links?: string;
  phone?: string;
  website?: string;
  socialLinks?: string;
  photoUrl?: string;
  profileSlug?: string;
}) => {
  const { rows } = await sql<ModeratorApplication>`
    UPDATE moderator_applications
    SET
      name = COALESCE(${payload.name ?? null}, name),
      email = COALESCE(${payload.email ?? null}, email),
      focus_areas = COALESCE(${payload.focusAreas ?? null}, focus_areas),
      experience = COALESCE(${payload.experience ?? null}, experience),
      links = COALESCE(${payload.links ?? null}, links),
      phone = COALESCE(${payload.phone ?? null}, phone),
      website = COALESCE(${payload.website ?? null}, website),
      social_links = COALESCE(${payload.socialLinks ?? null}, social_links),
      photo_url = COALESCE(${payload.photoUrl ?? null}, photo_url),
      profile_slug = COALESCE(${payload.profileSlug ?? null}, profile_slug)
    WHERE id = ${payload.id}
    RETURNING
      id,
      name,
      email,
      focus_areas as "focusAreas",
      experience,
      links,
      phone,
      website,
      social_links as "socialLinks",
      photo_url as "photoUrl",
      profile_slug as "profileSlug",
      submitted_at as "submittedAt",
      status
  `;
  return rows[0] || null;
};

export const getModeratorApplicationByEmail = async (email: string) => {
  const { rows } = await sql<ModeratorApplication>`
    SELECT
      id,
      name,
      email,
      focus_areas as "focusAreas",
      experience,
      links,
      phone,
      website,
      social_links as "socialLinks",
      photo_url as "photoUrl",
      profile_slug as "profileSlug",
      submitted_at as "submittedAt",
      status
    FROM moderator_applications
    WHERE LOWER(email) = LOWER(${email})
    ORDER BY submitted_at DESC
    LIMIT 1
  `;
  return rows[0] || null;
};

export const getModeratorApplicationBySlug = async (slug: string) => {
  const { rows } = await sql<ModeratorApplication>`
    SELECT
      ma.id,
      ma.name,
      ma.email,
      ma.focus_areas as "focusAreas",
      ma.experience,
      ma.links,
      ma.phone,
      ma.website,
      ma.social_links as "socialLinks",
      ma.photo_url as "photoUrl",
      ma.profile_slug as "profileSlug",
      ma.submitted_at as "submittedAt",
      ma.status
    FROM moderator_applications ma
    INNER JOIN moderators m ON LOWER(m.email) = LOWER(ma.email) AND m.status = 'active'
    WHERE LOWER(ma.profile_slug) = LOWER(${slug})
      AND ma.status = 'approved'
    LIMIT 1
  `;
  return rows[0] || null;
};

export const listModerators = async () => {
  const { rows } = await sql<ModeratorAccount>`
    SELECT
      id,
      name,
      email,
      password_hash as "passwordHash",
      COALESCE(assigned_user_emails, ARRAY[]::text[]) as "assignedUserEmails",
      status,
      created_at as "createdAt"
    FROM moderators
    ORDER BY created_at DESC
  `;
  return rows;
};

/** Facilitators that have this member email on their assigned list. */
export const getFacilitatorsForMemberEmail = async (memberEmail: string) => {
  const normalized = memberEmail.trim().toLowerCase();
  const moderators = await listModerators();
  return moderators.filter((m) =>
    (m.assignedUserEmails ?? []).some((e) => e.trim().toLowerCase() === normalized)
  );
};

/** Assign member to one facilitator (or none). Removes email from all other facilitators. */
export const setMemberFacilitatorAssignment = async (
  memberEmail: string,
  facilitatorId: string | null
) => {
  const trimmed = memberEmail.trim();
  const normalized = trimmed.toLowerCase();
  const moderators = await listModerators();

  for (const mod of moderators) {
    const emails = mod.assignedUserEmails ?? [];
    const hasMember = emails.some((e) => e.trim().toLowerCase() === normalized);
    const shouldHave = facilitatorId !== null && mod.id === facilitatorId;

    if (hasMember && !shouldHave) {
      await updateModeratorAccount({
        moderatorId: mod.id,
        assignedUserEmails: emails.filter((e) => e.trim().toLowerCase() !== normalized)
      });
    } else if (!hasMember && shouldHave) {
      await updateModeratorAccount({
        moderatorId: mod.id,
        assignedUserEmails: [...emails, trimmed]
      });
    }
  }

  return facilitatorId ? getFacilitatorsForMemberEmail(trimmed) : [];
};

export type StaffActivityRow = {
  id: string;
  actorType: "admin" | "moderator";
  actorEmail: string;
  actorName: string | null;
  action: string;
  createdAt: string;
};

export const recordStaffActivity = async (
  actorType: "admin" | "moderator",
  actorEmail: string,
  action: string,
  actorName?: string | null
): Promise<void> => {
  try {
    await sql`
      INSERT INTO staff_activity_log (actor_type, actor_email, actor_name, action)
      VALUES (${actorType}, ${actorEmail}, ${actorName ?? null}, ${action})
    `;
  } catch {
    // Table may not exist yet
  }
};

/** Last login time by staff email (from staff_activity_log where action = 'login'). */
export const getLastLoginByStaffEmail = async (): Promise<Map<string, string>> => {
  const map = new Map<string, string>();
  try {
    const { rows } = await sql<{ actor_email: string; last_at: string }>`
      SELECT actor_email, MAX(created_at)::text AS last_at
      FROM staff_activity_log
      WHERE action = 'login'
      GROUP BY actor_email
    `;
    for (const r of rows) {
      map.set(r.actor_email.toLowerCase(), r.last_at);
    }
  } catch {
    // Table may not exist
  }
  return map;
};

export const getStaffActivityLog = async (limit: number = 100): Promise<StaffActivityRow[]> => {
  try {
    const { rows } = await sql<{
      id: string;
      actor_type: string;
      actor_email: string;
      actor_name: string | null;
      action: string;
      created_at: string;
    }>`
      SELECT id, actor_type, actor_email, actor_name, action, created_at
      FROM staff_activity_log
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      id: r.id,
      actorType: r.actor_type === "moderator" ? "moderator" : "admin",
      actorEmail: r.actor_email,
      actorName: r.actor_name,
      action: r.action,
      createdAt: r.created_at
    }));
  } catch {
    return [];
  }
};

export const getModeratorByEmail = async (email: string) => {
  const { rows } = await sql<ModeratorAccount>`
    SELECT
      id,
      name,
      email,
      password_hash as "passwordHash",
      COALESCE(assigned_user_emails, ARRAY[]::text[]) as "assignedUserEmails",
      status,
      created_at as "createdAt"
    FROM moderators
    WHERE LOWER(email) = LOWER(${email})
    LIMIT 1
  `;
  return rows[0] || null;
};

export type ModeratorAssignedMemberSummary = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  subscriptionTier: "platinum" | "platinum_managed" | null;
  subscriptionStatus: string | null;
  registered: boolean;
};

export const getMemberSummariesByEmails = async (
  emails: string[]
): Promise<ModeratorAssignedMemberSummary[]> => {
  const unique = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (!unique.length) return [];

  const { rows } = await sql<{
    email: string;
    firstName: string | null;
    lastName: string | null;
    subscriptionTier: "platinum" | "platinum_managed" | null;
    subscriptionStatus: string | null;
  }>`
    SELECT
      u.email,
      mp.first_name AS "firstName",
      mp.last_name AS "lastName",
      s.tier AS "subscriptionTier",
      s.status AS "subscriptionStatus"
    FROM users u
    LEFT JOIN member_profiles mp ON mp.user_id = u.id
    LEFT JOIN subscriptions s ON s.user_id = u.id
    WHERE LOWER(u.email) = ANY(${toPgArray(unique)}::text[])
  `;

  const byEmail = new Map(rows.map((row) => [row.email.toLowerCase(), row]));

  return unique.map((email) => {
    const row = byEmail.get(email);
    if (!row) {
      return {
        email,
        firstName: null,
        lastName: null,
        subscriptionTier: null,
        subscriptionStatus: null,
        registered: false
      };
    }
    return {
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      subscriptionTier: row.subscriptionTier,
      subscriptionStatus: row.subscriptionStatus,
      registered: true
    };
  });
};

export const listUsersByEmails = async (emails: string[]): Promise<UserRowWithName[]> => {
  const unique = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (!unique.length) return [];

  const { rows } = await sql<UserRowWithName>`
    SELECT
      u.id,
      u.email,
      COALESCE(u.goal_ids, ARRAY[]::text[]) AS "goalIds",
      u.goal_updated_at AS "goalUpdatedAt",
      COALESCE(u.plays_per_night, 2) AS "playsPerNight",
      s.status AS "subscriptionStatus",
      s.tier AS "subscriptionTier",
      s.stripe_customer_id AS "stripeCustomerId",
      s.stripe_subscription_id AS "stripeSubscriptionId",
      mp.first_name AS "firstName",
      mp.last_name AS "lastName"
    FROM users u
    LEFT JOIN subscriptions s ON s.user_id = u.id
    LEFT JOIN member_profiles mp ON mp.user_id = u.id
    WHERE LOWER(u.email) = ANY(${toPgArray(unique)}::text[])
    ORDER BY u.email ASC
  `;
  return rows;
};

export const createModeratorAccount = async (payload: {
  name: string;
  email: string;
  passwordHash: string;
  assignedUserEmails: string[];
}) => {
  const { rows } = await sql<ModeratorAccount>`
    INSERT INTO moderators
      (name, email, password_hash, assigned_user_emails, status)
    VALUES
      (${payload.name}, ${payload.email}, ${payload.passwordHash},
       ${toPgArray(payload.assignedUserEmails)}::text[], 'active')
    RETURNING
      id,
      name,
      email,
      password_hash as "passwordHash",
      COALESCE(assigned_user_emails, ARRAY[]::text[]) as "assignedUserEmails",
      status,
      created_at as "createdAt"
  `;
  return rows[0];
};

export const updateModeratorAccount = async (payload: {
  moderatorId: string;
  name?: string;
  email?: string;
  assignedUserEmails?: string[];
  status?: ModeratorAccount["status"];
  passwordHash?: string;
}) => {
  const { rows } = await sql<ModeratorAccount>`
    UPDATE moderators
    SET
      name = COALESCE(${payload.name ?? null}, name),
      email = COALESCE(${payload.email ?? null}, email),
      assigned_user_emails = COALESCE(
        ${payload.assignedUserEmails ? toPgArray(payload.assignedUserEmails) : null}::text[],
        assigned_user_emails
      ),
      status = COALESCE(${payload.status ?? null}, status),
      password_hash = COALESCE(${payload.passwordHash ?? null}, password_hash)
    WHERE id = ${payload.moderatorId}
    RETURNING
      id,
      name,
      email,
      password_hash as "passwordHash",
      COALESCE(assigned_user_emails, ARRAY[]::text[]) as "assignedUserEmails",
      status,
      created_at as "createdAt"
  `;
  return rows[0] || null;
};

export const updateFacilitatorProfile = async (payload: {
  moderatorId: string;
  applicationId: string;
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
}) => {
  const application = await updateModeratorApplication({
    id: payload.applicationId,
    name: payload.name,
    email: payload.email,
    focusAreas: payload.focusAreas,
    experience: payload.experience,
    links: payload.links,
    phone: payload.phone,
    website: payload.website,
    socialLinks: payload.socialLinks,
    photoUrl: payload.photoUrl,
    profileSlug: payload.profileSlug
  });
  if (!application) {
    return null;
  }
  const moderator = await updateModeratorAccount({
    moderatorId: payload.moderatorId,
    name: payload.name,
    email: payload.email
  });
  if (!moderator) {
    return null;
  }
  return { application, moderator };
};

/** Plans offered for signup / upgrade - exclude legacy bronze/gold package rows. */
const OFFERED_SUBSCRIPTION_PLAN_IDS = new Set(["platinum", "platinum_managed"]);

export const listSubscriptionPlans = async () => {
  await ensureSubscriptionPlansSeeded();
  const { rows } = await sql<SubscriptionPlan>`
    SELECT id, name, price_id as "priceId", trial_days as "trialDays", description
    FROM subscription_plans
    ORDER BY id ASC
  `;
  return rows.filter((plan) => OFFERED_SUBSCRIPTION_PLAN_IDS.has(plan.id));
};

export const saveSubscriptionPlans = async (plans: SubscriptionPlan[]) => {
  await Promise.all(
    plans.map((plan) =>
      sql`
        INSERT INTO subscription_plans (id, name, price_id, trial_days, description)
        VALUES (${plan.id}, ${plan.name}, ${plan.priceId}, ${plan.trialDays}, ${plan.description})
        ON CONFLICT (id)
        DO UPDATE SET
          name = EXCLUDED.name,
          price_id = EXCLUDED.price_id,
          trial_days = EXCLUDED.trial_days,
          description = EXCLUDED.description
      `
    )
  );
};

export const getPlaybackSettings = async () => {
  await ensurePlaybackSettingsSeeded();
  await normalizePlaybackAddTrackEveryMainPlays();
  const { rows } = await sql<PlaybackSettings>`
    SELECT
      plays_per_recording as "playsPerRecording",
      nightly_gap_hours as "nightlyGapHours",
      add_new_track_every_nights as "addNewTrackEveryNights",
      initial_tracks as "initialTracks",
      cgmr_track_id as "cgmrTrackId",
      fallback_track_id as "fallbackTrackId"
    FROM playback_settings
    WHERE id = 1
    LIMIT 1
  `;
  if (!rows[0]) {
    return normalizePlaybackSkuFields(defaultPlaybackSettings);
  }
  return normalizePlaybackSkuFields(rows[0]);
};

const normalizePlaybackSkuFields = (settings: PlaybackSettings): PlaybackSettings => ({
  ...settings,
  cgmrTrackId: settings.cgmrTrackId ? stripSkuHyphens(settings.cgmrTrackId) : settings.cgmrTrackId,
  fallbackTrackId: settings.fallbackTrackId
    ? stripSkuHyphens(settings.fallbackTrackId)
    : settings.fallbackTrackId
});

export const savePlaybackSettings = async (settings: PlaybackSettings) => {
  const normalized = normalizePlaybackSkuFields(settings);
  const addEvery = canonicalAddNewTrackEveryMainPlays();
  await sql`
    INSERT INTO playback_settings
      (id, plays_per_recording, nightly_gap_hours, add_new_track_every_nights, initial_tracks, cgmr_track_id, fallback_track_id)
    VALUES
      (1, ${normalized.playsPerRecording}, ${normalized.nightlyGapHours},
       ${addEvery}, ${normalized.initialTracks},
       ${normalized.cgmrTrackId}, ${normalized.fallbackTrackId})
    ON CONFLICT (id)
    DO UPDATE SET
      plays_per_recording = EXCLUDED.plays_per_recording,
      nightly_gap_hours = EXCLUDED.nightly_gap_hours,
      add_new_track_every_nights = EXCLUDED.add_new_track_every_nights,
      initial_tracks = EXCLUDED.initial_tracks,
      cgmr_track_id = EXCLUDED.cgmr_track_id,
      fallback_track_id = EXCLUDED.fallback_track_id
  `;
};

export const getUserIdByStripeSubscriptionId = async (subscriptionId: string) => {
  const id = subscriptionId.trim();
  if (!id) return null;
  const { rows } = await sql<{ user_id: string }>`
    SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ${id} LIMIT 1
  `;
  return rows[0]?.user_id ?? null;
};

export const getUserIdByStripeCustomerId = async (customerId: string) => {
  const id = customerId.trim();
  if (!id) return null;
  const { rows } = await sql<{ user_id: string }>`
    SELECT user_id FROM subscriptions WHERE stripe_customer_id = ${id} LIMIT 1
  `;
  return rows[0]?.user_id ?? null;
};

export const getUserByAffiliateCode = async (code: string) => {
  const normalized = normalizeAffiliateCode(code);
  if (!normalized) return null;
  const { rows } = await sql<{ id: string; email: string }>`
    SELECT id, email FROM users WHERE affiliate_code = ${normalized} LIMIT 1
  `;
  return rows[0] ?? null;
};

export type UserReferralAttribution = {
  userId: string;
  email: string;
  affiliateCode: string | null;
  referredByAffiliateCode: string | null;
};

export const getUserReferralAttribution = async (userId: string) => {
  const { rows } = await sql<{
    id: string;
    email: string;
    affiliate_code: string | null;
    referred_by_affiliate_code: string | null;
  }>`
    SELECT id, email, affiliate_code, referred_by_affiliate_code
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    userId: row.id,
    email: row.email,
    affiliateCode: row.affiliate_code,
    referredByAffiliateCode: row.referred_by_affiliate_code
  } satisfies UserReferralAttribution;
};

export const resolveAffiliateOwnerByCode = async (code: string) => {
  const normalized = normalizeAffiliateCode(code);
  if (!normalized) return null;

  const user = await getUserByAffiliateCode(normalized);
  if (user) {
    const profile = await getMemberProfileByUserId(user.id);
    const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim();
    return {
      userId: user.id,
      email: user.email,
      name: name || null
    };
  }

  const { rows } = await sql<{
    user_id: string | null;
    email: string;
    name: string;
  }>`
    SELECT user_id, email, name
    FROM affiliate_applications
    WHERE affiliate_code = ${normalized} AND status = 'approved'
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const app = rows[0];
  if (!app) return null;
  return {
    userId: app.user_id ?? null,
    email: app.email,
    name: app.name
  };
};

export const getAffiliateCommissionByInvoiceId = async (invoiceId: string) => {
  const { rows } = await sql<{ id: string }>`
    SELECT id FROM affiliate_commissions WHERE stripe_invoice_id = ${invoiceId} LIMIT 1
  `;
  return rows[0] ?? null;
};

export const insertAffiliateCommission = async (payload: {
  affiliateCode: string;
  affiliateUserId: string | null;
  referredUserId: string;
  stripeInvoiceId: string;
  stripeEventId: string | null;
  grossAmountCents: number;
  commissionAmountCents: number;
  currency: string;
}) => {
  await sql`
    INSERT INTO affiliate_commissions (
      affiliate_code,
      affiliate_user_id,
      referred_user_id,
      stripe_invoice_id,
      stripe_event_id,
      gross_amount_cents,
      commission_amount_cents,
      currency,
      status
    )
    VALUES (
      ${payload.affiliateCode},
      ${payload.affiliateUserId},
      ${payload.referredUserId},
      ${payload.stripeInvoiceId},
      ${payload.stripeEventId},
      ${payload.grossAmountCents},
      ${payload.commissionAmountCents},
      ${payload.currency},
      'pending'
    )
    ON CONFLICT (stripe_invoice_id) DO NOTHING
  `;
};

export const getAffiliatePendingBalanceCents = async (affiliateCode: string) => {
  const code = normalizeAffiliateCode(affiliateCode);
  if (!code) return 0;
  const { rows } = await sql<{ total: number | null }>`
    SELECT COALESCE(SUM(commission_amount_cents), 0)::int AS total
    FROM affiliate_commissions
    WHERE affiliate_code = ${code} AND status = 'pending'
  `;
  return rows[0]?.total ?? 0;
};

export type UserStripeConnectFields = {
  stripeConnectAccountId: string | null;
  stripeConnectDetailsSubmitted: boolean;
  stripeConnectPayoutsEnabled: boolean;
};

export const getUserStripeConnectFields = async (userId: string): Promise<UserStripeConnectFields | null> => {
  const { rows } = await sql<{
    stripe_connect_account_id: string | null;
    stripe_connect_details_submitted: boolean;
    stripe_connect_payouts_enabled: boolean;
  }>`
    SELECT stripe_connect_account_id, stripe_connect_details_submitted, stripe_connect_payouts_enabled
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    stripeConnectAccountId: row.stripe_connect_account_id,
    stripeConnectDetailsSubmitted: row.stripe_connect_details_submitted,
    stripeConnectPayoutsEnabled: row.stripe_connect_payouts_enabled
  };
};

export const setUserStripeConnectAccount = async (
  userId: string,
  accountId: string,
  flags: { detailsSubmitted: boolean; payoutsEnabled: boolean }
) => {
  await sql`
    UPDATE users
    SET
      stripe_connect_account_id = ${accountId},
      stripe_connect_details_submitted = ${flags.detailsSubmitted},
      stripe_connect_payouts_enabled = ${flags.payoutsEnabled}
    WHERE id = ${userId}
  `;
};

export const syncUserStripeConnectFromStripeAccount = async (
  account: {
    id: string;
    details_submitted?: boolean;
    payouts_enabled?: boolean;
    metadata?: { rfts_user_id?: string } | null;
  },
  userIdHint?: string
) => {
  const userId = userIdHint || account.metadata?.rfts_user_id;
  const detailsSubmitted = account.details_submitted ?? false;
  const payoutsEnabled = account.payouts_enabled ?? false;
  if (userId) {
    await sql`
      UPDATE users
      SET
        stripe_connect_account_id = ${account.id},
        stripe_connect_details_submitted = ${detailsSubmitted},
        stripe_connect_payouts_enabled = ${payoutsEnabled}
      WHERE id = ${userId}
    `;
    return;
  }
  await sql`
    UPDATE users
    SET
      stripe_connect_details_submitted = ${detailsSubmitted},
      stripe_connect_payouts_enabled = ${payoutsEnabled}
    WHERE stripe_connect_account_id = ${account.id}
  `;
};

export const listAffiliateCodesAbovePayoutThreshold = async (thresholdCents: number) => {
  const { rows } = await sql<{ affiliate_code: string }>`
    SELECT affiliate_code
    FROM affiliate_commissions
    WHERE status = 'pending'
    GROUP BY affiliate_code
    HAVING COALESCE(SUM(commission_amount_cents), 0) >= ${thresholdCents}
  `;
  return rows.map((row) => row.affiliate_code);
};

export const listAffiliatePayoutSummaries = async () => {
  const { rows } = await sql<{
    affiliateCode: string;
    pendingBalanceCents: number;
    pendingCommissionCount: number;
    paidBalanceCents: number;
  }>`
    SELECT
      affiliate_code AS "affiliateCode",
      COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount_cents ELSE 0 END), 0)::int
        AS "pendingBalanceCents",
      COUNT(*) FILTER (WHERE status = 'pending')::int AS "pendingCommissionCount",
      COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount_cents ELSE 0 END), 0)::int
        AS "paidBalanceCents"
    FROM affiliate_commissions
    GROUP BY affiliate_code
    ORDER BY
      COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount_cents ELSE 0 END), 0) DESC,
      affiliate_code ASC
  `;

  const summaries = [];
  for (const row of rows) {
    const owner = await resolveAffiliateOwnerByCode(row.affiliateCode);
    let payoutMethod: string | null = null;
    let payoutDetail: string | null = null;
    let stripeConnectAccountId: string | null = null;
    let stripeConnectReady = false;

    if (owner?.userId) {
      const profile = await getMemberProfileByUserId(owner.userId);
      payoutMethod = profile?.affiliatePayoutMethod ?? null;
      payoutDetail = profile?.affiliatePayoutDetail ?? null;
      const connect = await getUserStripeConnectFields(owner.userId);
      if (connect?.stripeConnectAccountId) {
        stripeConnectAccountId = connect.stripeConnectAccountId;
        stripeConnectReady =
          connect.stripeConnectDetailsSubmitted && connect.stripeConnectPayoutsEnabled;
      }
    } else if (owner?.email) {
      const { rows: appRows } = await sql<{
        payout_method: string | null;
        payout_address: string | null;
      }>`
        SELECT payout_method, payout_address
        FROM affiliate_applications
        WHERE affiliate_code = ${row.affiliateCode}
        ORDER BY created_at DESC
        LIMIT 1
      `;
      payoutMethod = appRows[0]?.payout_method ?? null;
      payoutDetail = appRows[0]?.payout_address ?? null;
    }

    summaries.push({
      affiliateCode: row.affiliateCode,
      affiliateUserId: owner?.userId ?? null,
      affiliateEmail: owner?.email ?? null,
      affiliateName: owner?.name ?? null,
      payoutMethod,
      payoutDetail,
      stripeConnectAccountId,
      stripeConnectReady,
      pendingBalanceCents: row.pendingBalanceCents,
      pendingCommissionCount: row.pendingCommissionCount,
      paidBalanceCents: row.paidBalanceCents
    });
  }

  return summaries;
};

export const markAffiliateCommissionsPaid = async (
  affiliateCode: string,
  payoutNotes?: string | null
) => {
  const code = normalizeAffiliateCode(affiliateCode);
  if (!code) return 0;
  const { rows } = await sql<{ count: number }>`
    WITH updated AS (
      UPDATE affiliate_commissions
      SET status = 'paid', paid_at = now(), payout_notes = ${payoutNotes ?? null}
      WHERE affiliate_code = ${code} AND status = 'pending'
      RETURNING 1
    )
    SELECT COUNT(*)::int AS count FROM updated
  `;
  return rows[0]?.count ?? 0;
};

// --- Marketing control panel ---

export type MarketingKpis = {
  totalMembers: number;
  activeMemberships: number;
  newThisMonth: number;
  referredSignups: number;
  referredThisMonth: number;
  /** Distinct members with a listen/session in the last 7 days (North Star). */
  weeklyActiveListeners: number;
  /** D7 retention % for the cohort that signed up 7–14 days ago; null if no eligible members. */
  retentionD7Percent: number | null;
  retentionD7Retained: number;
  retentionD7Eligible: number;
};

const emptyMarketingKpis = (): MarketingKpis => ({
  totalMembers: 0,
  activeMemberships: 0,
  newThisMonth: 0,
  referredSignups: 0,
  referredThisMonth: 0,
  weeklyActiveListeners: 0,
  retentionD7Percent: null,
  retentionD7Retained: 0,
  retentionD7Eligible: 0
});

export const getMarketingKpis = async (): Promise<MarketingKpis> => {
  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  ).toISOString();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString();

  const { rows } = await sql<{
    totalMembers: number;
    activeMemberships: number;
    newThisMonth: number;
    referredSignups: number;
    referredThisMonth: number;
  }>`
    SELECT
      COUNT(*)::int AS "totalMembers",
      COUNT(*) FILTER (WHERE s.status = 'active')::int AS "activeMemberships",
      COUNT(*) FILTER (WHERE u.created_at >= ${startOfMonth})::int AS "newThisMonth",
      COUNT(*) FILTER (
        WHERE u.referred_by_affiliate_code IS NOT NULL AND u.referred_by_affiliate_code <> ''
      )::int AS "referredSignups",
      COUNT(*) FILTER (
        WHERE u.referred_by_affiliate_code IS NOT NULL
          AND u.referred_by_affiliate_code <> ''
          AND u.created_at >= ${startOfMonth}
      )::int AS "referredThisMonth"
    FROM users u
    LEFT JOIN subscriptions s ON s.user_id = u.id
  `;

  const base = {
    ...emptyMarketingKpis(),
    ...(rows[0] || {})
  };

  let weeklyActiveListeners = 0;
  try {
    const { rows: walRows } = await sql<{ count: number }>`
      SELECT COUNT(*)::int AS count FROM (
        SELECT user_id FROM member_session_usage
        WHERE used_at >= ${sevenDaysAgo}
        UNION
        SELECT user_id FROM member_activity_log
        WHERE created_at >= ${sevenDaysAgo}
          AND action IN ('played_audio', 'audio_playback_outcome')
      ) listeners
    `;
    weeklyActiveListeners = walRows[0]?.count ?? 0;
  } catch {
    weeklyActiveListeners = 0;
  }

  let retentionD7Eligible = 0;
  let retentionD7Retained = 0;
  try {
    // Cohort: signed up 7–14 days ago (old enough to have reached day 7).
    // Retained: listen/session activity on day 6–8 after signup.
    const { rows: d7Rows } = await sql<{
      eligible: number;
      retained: number;
    }>`
      WITH cohort AS (
        SELECT id, created_at
        FROM users
        WHERE created_at >= ${fourteenDaysAgo}
          AND created_at < ${sevenDaysAgo}
      ),
      retained AS (
        SELECT DISTINCT c.id
        FROM cohort c
        WHERE EXISTS (
          SELECT 1 FROM member_session_usage s
          WHERE s.user_id = c.id
            AND s.used_at >= c.created_at + interval '6 days'
            AND s.used_at < c.created_at + interval '8 days'
        )
        OR EXISTS (
          SELECT 1 FROM member_activity_log m
          WHERE m.user_id = c.id
            AND m.action IN ('played_audio', 'audio_playback_outcome')
            AND m.created_at >= c.created_at + interval '6 days'
            AND m.created_at < c.created_at + interval '8 days'
        )
      )
      SELECT
        (SELECT COUNT(*)::int FROM cohort) AS eligible,
        (SELECT COUNT(*)::int FROM retained) AS retained
    `;
    retentionD7Eligible = d7Rows[0]?.eligible ?? 0;
    retentionD7Retained = d7Rows[0]?.retained ?? 0;
  } catch {
    retentionD7Eligible = 0;
    retentionD7Retained = 0;
  }

  const retentionD7Percent =
    retentionD7Eligible > 0
      ? Math.round((retentionD7Retained / retentionD7Eligible) * 1000) / 10
      : null;

  return {
    ...base,
    weeklyActiveListeners,
    retentionD7Percent,
    retentionD7Retained,
    retentionD7Eligible
  };
};

export type MarketingReferrerRow = {
  code: string;
  signups: number;
  active: number;
};

export const listTopReferrers = async (
  limit = 20
): Promise<MarketingReferrerRow[]> => {
  const { rows } = await sql<MarketingReferrerRow>`
    SELECT
      u.referred_by_affiliate_code AS "code",
      COUNT(*)::int AS "signups",
      COUNT(*) FILTER (WHERE s.status = 'active')::int AS "active"
    FROM users u
    LEFT JOIN subscriptions s ON s.user_id = u.id
    WHERE u.referred_by_affiliate_code IS NOT NULL AND u.referred_by_affiliate_code <> ''
    GROUP BY u.referred_by_affiliate_code
    ORDER BY COUNT(*) DESC
    LIMIT ${limit}
  `;
  return rows;
};

export type OutreachTarget = {
  id: string;
  organization: string;
  /** `organization` | `individual` - `organization` column stores the display name either way. */
  targetType: string;
  category: string | null;
  persona: string | null;
  entryPath: string | null;
  contact: string | null;
  refCode: string | null;
  status: string;
  notes: string | null;
  interest: string | null;
  audienceSize: string | null;
  decisionTimeline: string | null;
  followUpAt: string | null;
  doNotEmail: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OutreachContact = {
  id: string;
  targetId: string;
  /** Display name (synced from first + last when those are set). */
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  phoneMobile: string | null;
  roleTitle: string | null;
  preferredTimes: string | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  xUrl: string | null;
  websiteUrl: string | null;
  notes: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OutreachActivity = {
  id: string;
  targetId: string;
  contactId: string | null;
  kind: string;
  subject: string | null;
  bodyPreview: string | null;
  meta: Record<string, unknown>;
  createdByEmail: string | null;
  createdAt: string;
};

let marketingOutreachTableReady = false;
const ensureMarketingOutreachTable = async () => {
  if (marketingOutreachTableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS marketing_outreach_targets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization text NOT NULL,
      target_type text NOT NULL DEFAULT 'organization',
      category text,
      persona text,
      entry_path text,
      contact text,
      ref_code text,
      status text NOT NULL DEFAULT 'prospect',
      notes text,
      interest text,
      audience_size text,
      decision_timeline text,
      follow_up_at timestamptz,
      do_not_email boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    ALTER TABLE marketing_outreach_targets
    ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'organization'
  `;
  await sql`ALTER TABLE marketing_outreach_targets ADD COLUMN IF NOT EXISTS interest text`;
  await sql`ALTER TABLE marketing_outreach_targets ADD COLUMN IF NOT EXISTS audience_size text`;
  await sql`ALTER TABLE marketing_outreach_targets ADD COLUMN IF NOT EXISTS decision_timeline text`;
  await sql`ALTER TABLE marketing_outreach_targets ADD COLUMN IF NOT EXISTS follow_up_at timestamptz`;
  await sql`
    ALTER TABLE marketing_outreach_targets
    ADD COLUMN IF NOT EXISTS do_not_email boolean NOT NULL DEFAULT false
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS marketing_outreach_contacts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      target_id uuid NOT NULL REFERENCES marketing_outreach_targets(id) ON DELETE CASCADE,
      name text NOT NULL DEFAULT '',
      first_name text,
      last_name text,
      email text,
      phone text,
      phone_mobile text,
      role_title text,
      preferred_times text,
      linkedin_url text,
      instagram_url text,
      facebook_url text,
      x_url text,
      website_url text,
      notes text,
      is_primary boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`ALTER TABLE marketing_outreach_contacts ADD COLUMN IF NOT EXISTS first_name text`;
  await sql`ALTER TABLE marketing_outreach_contacts ADD COLUMN IF NOT EXISTS last_name text`;
  await sql`ALTER TABLE marketing_outreach_contacts ADD COLUMN IF NOT EXISTS phone_mobile text`;
  await sql`ALTER TABLE marketing_outreach_contacts ADD COLUMN IF NOT EXISTS linkedin_url text`;
  await sql`ALTER TABLE marketing_outreach_contacts ADD COLUMN IF NOT EXISTS instagram_url text`;
  await sql`ALTER TABLE marketing_outreach_contacts ADD COLUMN IF NOT EXISTS facebook_url text`;
  await sql`ALTER TABLE marketing_outreach_contacts ADD COLUMN IF NOT EXISTS x_url text`;
  await sql`ALTER TABLE marketing_outreach_contacts ADD COLUMN IF NOT EXISTS website_url text`;
  await sql`ALTER TABLE marketing_outreach_contacts ADD COLUMN IF NOT EXISTS notes text`;
  await sql`
    CREATE TABLE IF NOT EXISTS marketing_outreach_activities (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      target_id uuid NOT NULL REFERENCES marketing_outreach_targets(id) ON DELETE CASCADE,
      contact_id uuid REFERENCES marketing_outreach_contacts(id) ON DELETE SET NULL,
      kind text NOT NULL,
      subject text,
      body_preview text,
      meta jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_by_email text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  marketingOutreachTableReady = true;
};

export const listOutreachTargets = async (): Promise<OutreachTarget[]> => {
  await ensureMarketingOutreachTable();
  const { rows } = await sql<OutreachTarget>`
    SELECT
      id, organization,
      COALESCE(NULLIF(target_type, ''), 'organization') AS "targetType",
      category, persona,
      entry_path AS "entryPath", contact, ref_code AS "refCode",
      status, notes, interest,
      audience_size AS "audienceSize",
      decision_timeline AS "decisionTimeline",
      follow_up_at AS "followUpAt",
      COALESCE(do_not_email, false) AS "doNotEmail",
      created_at AS "createdAt", updated_at AS "updatedAt"
    FROM marketing_outreach_targets
    ORDER BY
      CASE WHEN follow_up_at IS NOT NULL AND follow_up_at <= now() + interval '7 days' THEN 0 ELSE 1 END,
      follow_up_at ASC NULLS LAST,
      created_at DESC
  `;
  return rows;
};

export const getOutreachTarget = async (id: string): Promise<OutreachTarget | null> => {
  await ensureMarketingOutreachTable();
  const { rows } = await sql<OutreachTarget>`
    SELECT
      id, organization,
      COALESCE(NULLIF(target_type, ''), 'organization') AS "targetType",
      category, persona,
      entry_path AS "entryPath", contact, ref_code AS "refCode",
      status, notes, interest,
      audience_size AS "audienceSize",
      decision_timeline AS "decisionTimeline",
      follow_up_at AS "followUpAt",
      COALESCE(do_not_email, false) AS "doNotEmail",
      created_at AS "createdAt", updated_at AS "updatedAt"
    FROM marketing_outreach_targets
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
};

type OutreachTargetWrite = {
  organization: string;
  targetType?: string | null;
  category?: string | null;
  persona?: string | null;
  entryPath?: string | null;
  contact?: string | null;
  refCode?: string | null;
  status?: string | null;
  notes?: string | null;
  interest?: string | null;
  audienceSize?: string | null;
  decisionTimeline?: string | null;
  followUpAt?: string | null;
  doNotEmail?: boolean | null;
};

const normalizeOutreachTargetType = (value?: string | null): string =>
  value === "individual" ? "individual" : "organization";

export const createOutreachTarget = async (
  input: OutreachTargetWrite
): Promise<OutreachTarget> => {
  await ensureMarketingOutreachTable();
  const targetType = normalizeOutreachTargetType(input.targetType);
  const { rows } = await sql<OutreachTarget>`
    INSERT INTO marketing_outreach_targets
      (organization, target_type, category, persona, entry_path, contact, ref_code, status, notes,
       interest, audience_size, decision_timeline, follow_up_at, do_not_email)
    VALUES (
      ${input.organization},
      ${targetType},
      ${input.category ?? null},
      ${input.persona ?? null},
      ${input.entryPath ?? null},
      ${input.contact ?? null},
      ${input.refCode ?? null},
      ${input.status ?? "prospect"},
      ${input.notes ?? null},
      ${input.interest ?? null},
      ${input.audienceSize ?? null},
      ${input.decisionTimeline ?? null},
      ${input.followUpAt ?? null},
      ${input.doNotEmail ?? false}
    )
    RETURNING
      id, organization,
      COALESCE(NULLIF(target_type, ''), 'organization') AS "targetType",
      category, persona,
      entry_path AS "entryPath", contact, ref_code AS "refCode",
      status, notes, interest,
      audience_size AS "audienceSize",
      decision_timeline AS "decisionTimeline",
      follow_up_at AS "followUpAt",
      COALESCE(do_not_email, false) AS "doNotEmail",
      created_at AS "createdAt", updated_at AS "updatedAt"
  `;
  return rows[0];
};

export const updateOutreachTarget = async (
  id: string,
  input: OutreachTargetWrite
): Promise<OutreachTarget | null> => {
  await ensureMarketingOutreachTable();
  const existing = await getOutreachTarget(id);
  if (!existing) return null;

  const organization = input.organization.trim() || existing.organization;
  const targetType = normalizeOutreachTargetType(
    input.targetType !== undefined ? input.targetType : existing.targetType
  );
  const category = input.category !== undefined ? input.category : existing.category;
  const persona = input.persona !== undefined ? input.persona : existing.persona;
  const entryPath = input.entryPath !== undefined ? input.entryPath : existing.entryPath;
  const contact = input.contact !== undefined ? input.contact : existing.contact;
  const refCode = input.refCode !== undefined ? input.refCode : existing.refCode;
  const status =
    input.status !== undefined && input.status !== null && String(input.status).trim()
      ? String(input.status).trim()
      : existing.status;
  const notes = input.notes !== undefined ? input.notes : existing.notes;
  const interest = input.interest !== undefined ? input.interest : existing.interest;
  const audienceSize =
    input.audienceSize !== undefined ? input.audienceSize : existing.audienceSize;
  const decisionTimeline =
    input.decisionTimeline !== undefined ? input.decisionTimeline : existing.decisionTimeline;
  const followUpAt =
    input.followUpAt !== undefined ? input.followUpAt : existing.followUpAt;
  const doNotEmail =
    input.doNotEmail !== undefined && input.doNotEmail !== null
      ? Boolean(input.doNotEmail)
      : existing.doNotEmail;

  const { rows } = await sql<OutreachTarget>`
    UPDATE marketing_outreach_targets
    SET
      organization = ${organization},
      target_type = ${targetType},
      category = ${category ?? null},
      persona = ${persona ?? null},
      entry_path = ${entryPath ?? null},
      contact = ${contact ?? null},
      ref_code = ${refCode ?? null},
      status = ${status},
      notes = ${notes ?? null},
      interest = ${interest ?? null},
      audience_size = ${audienceSize ?? null},
      decision_timeline = ${decisionTimeline ?? null},
      follow_up_at = ${followUpAt ?? null},
      do_not_email = ${doNotEmail},
      updated_at = now()
    WHERE id = ${id}
    RETURNING
      id, organization,
      COALESCE(NULLIF(target_type, ''), 'organization') AS "targetType",
      category, persona,
      entry_path AS "entryPath", contact, ref_code AS "refCode",
      status, notes, interest,
      audience_size AS "audienceSize",
      decision_timeline AS "decisionTimeline",
      follow_up_at AS "followUpAt",
      COALESCE(do_not_email, false) AS "doNotEmail",
      created_at AS "createdAt", updated_at AS "updatedAt"
  `;
  const updated = rows[0] ?? null;
  if (updated && doNotEmail && !existing.doNotEmail) {
    try {
      const { suppressCampaignsForTarget } = await import("@/lib/outreach-campaigns");
      await suppressCampaignsForTarget(id, "unsubscribed");
    } catch {
      // Campaign suppress is best-effort.
    }
  }
  if (updated && updated.status === "converted" && existing.status !== "converted") {
    try {
      const { suppressCampaignsForTarget } = await import("@/lib/outreach-campaigns");
      await suppressCampaignsForTarget(id, "converted");
    } catch {
      // Campaign suppress is best-effort.
    }
  }
  return updated;
};

export const deleteOutreachTarget = async (id: string): Promise<boolean> => {
  await ensureMarketingOutreachTable();
  const { rowCount } = await sql`
    DELETE FROM marketing_outreach_targets WHERE id = ${id}
  `;
  return (rowCount ?? 0) > 0;
};

export const listOutreachContacts = async (targetId: string): Promise<OutreachContact[]> => {
  await ensureMarketingOutreachTable();
  const { rows } = await sql<OutreachContact>`
    SELECT
      id, target_id AS "targetId", name,
      first_name AS "firstName", last_name AS "lastName",
      email, phone, phone_mobile AS "phoneMobile",
      role_title AS "roleTitle", preferred_times AS "preferredTimes",
      linkedin_url AS "linkedinUrl", instagram_url AS "instagramUrl",
      facebook_url AS "facebookUrl", x_url AS "xUrl", website_url AS "websiteUrl",
      notes,
      COALESCE(is_primary, false) AS "isPrimary",
      created_at AS "createdAt", updated_at AS "updatedAt"
    FROM marketing_outreach_contacts
    WHERE target_id = ${targetId}
    ORDER BY is_primary DESC, created_at ASC
  `;
  return rows;
};

export const listAllOutreachContacts = async (): Promise<OutreachContact[]> => {
  await ensureMarketingOutreachTable();
  const { rows } = await sql<OutreachContact>`
    SELECT
      id, target_id AS "targetId", name,
      first_name AS "firstName", last_name AS "lastName",
      email, phone, phone_mobile AS "phoneMobile",
      role_title AS "roleTitle", preferred_times AS "preferredTimes",
      linkedin_url AS "linkedinUrl", instagram_url AS "instagramUrl",
      facebook_url AS "facebookUrl", x_url AS "xUrl", website_url AS "websiteUrl",
      notes,
      COALESCE(is_primary, false) AS "isPrimary",
      created_at AS "createdAt", updated_at AS "updatedAt"
    FROM marketing_outreach_contacts
    ORDER BY created_at ASC
  `;
  return rows;
};

export const getOutreachContact = async (id: string): Promise<OutreachContact | null> => {
  await ensureMarketingOutreachTable();
  const { rows } = await sql<OutreachContact>`
    SELECT
      id, target_id AS "targetId", name,
      first_name AS "firstName", last_name AS "lastName",
      email, phone, phone_mobile AS "phoneMobile",
      role_title AS "roleTitle", preferred_times AS "preferredTimes",
      linkedin_url AS "linkedinUrl", instagram_url AS "instagramUrl",
      facebook_url AS "facebookUrl", x_url AS "xUrl", website_url AS "websiteUrl",
      notes,
      COALESCE(is_primary, false) AS "isPrimary",
      created_at AS "createdAt", updated_at AS "updatedAt"
    FROM marketing_outreach_contacts
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
};

const composeOutreachContactName = (input: {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
}): string => {
  const composed = [input.firstName, input.lastName]
    .map((p) => (p || "").trim())
    .filter(Boolean)
    .join(" ");
  if (composed) return composed;
  return (input.name || "").trim();
};

type OutreachContactWrite = {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  phoneMobile?: string | null;
  roleTitle?: string | null;
  preferredTimes?: string | null;
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  xUrl?: string | null;
  websiteUrl?: string | null;
  notes?: string | null;
  isPrimary?: boolean | null;
};

export const createOutreachContact = async (
  input: OutreachContactWrite & { targetId: string }
): Promise<OutreachContact> => {
  await ensureMarketingOutreachTable();
  if (input.isPrimary) {
    await sql`
      UPDATE marketing_outreach_contacts SET is_primary = false WHERE target_id = ${input.targetId}
    `;
  }
  const firstName = input.firstName?.trim() || null;
  const lastName = input.lastName?.trim() || null;
  const name = composeOutreachContactName({
    firstName,
    lastName,
    name: input.name
  });
  const { rows } = await sql<OutreachContact>`
    INSERT INTO marketing_outreach_contacts
      (target_id, name, first_name, last_name, email, phone, phone_mobile,
       role_title, preferred_times, linkedin_url, instagram_url, facebook_url,
       x_url, website_url, notes, is_primary)
    VALUES (
      ${input.targetId},
      ${name},
      ${firstName},
      ${lastName},
      ${input.email?.trim() || null},
      ${input.phone?.trim() || null},
      ${input.phoneMobile?.trim() || null},
      ${input.roleTitle?.trim() || null},
      ${input.preferredTimes?.trim() || null},
      ${input.linkedinUrl?.trim() || null},
      ${input.instagramUrl?.trim() || null},
      ${input.facebookUrl?.trim() || null},
      ${input.xUrl?.trim() || null},
      ${input.websiteUrl?.trim() || null},
      ${input.notes?.trim() || null},
      ${!!input.isPrimary}
    )
    RETURNING
      id, target_id AS "targetId", name,
      first_name AS "firstName", last_name AS "lastName",
      email, phone, phone_mobile AS "phoneMobile",
      role_title AS "roleTitle", preferred_times AS "preferredTimes",
      linkedin_url AS "linkedinUrl", instagram_url AS "instagramUrl",
      facebook_url AS "facebookUrl", x_url AS "xUrl", website_url AS "websiteUrl",
      notes,
      COALESCE(is_primary, false) AS "isPrimary",
      created_at AS "createdAt", updated_at AS "updatedAt"
  `;
  return rows[0];
};

export const updateOutreachContact = async (
  id: string,
  input: OutreachContactWrite
): Promise<OutreachContact | null> => {
  await ensureMarketingOutreachTable();
  const existing = await getOutreachContact(id);
  if (!existing) return null;
  if (input.isPrimary) {
    await sql`
      UPDATE marketing_outreach_contacts SET is_primary = false WHERE target_id = ${existing.targetId}
    `;
  }
  const firstName =
    input.firstName !== undefined ? input.firstName?.trim() || null : existing.firstName;
  const lastName =
    input.lastName !== undefined ? input.lastName?.trim() || null : existing.lastName;
  const name = composeOutreachContactName({
    firstName,
    lastName,
    name: input.name !== undefined ? input.name : existing.name
  });
  const trimOrKeep = (
    next: string | null | undefined,
    prev: string | null
  ): string | null => (next !== undefined ? next?.trim() || null : prev);

  const { rows } = await sql<OutreachContact>`
    UPDATE marketing_outreach_contacts
    SET
      name = ${name},
      first_name = ${firstName},
      last_name = ${lastName},
      email = ${trimOrKeep(input.email, existing.email)},
      phone = ${trimOrKeep(input.phone, existing.phone)},
      phone_mobile = ${trimOrKeep(input.phoneMobile, existing.phoneMobile)},
      role_title = ${trimOrKeep(input.roleTitle, existing.roleTitle)},
      preferred_times = ${trimOrKeep(input.preferredTimes, existing.preferredTimes)},
      linkedin_url = ${trimOrKeep(input.linkedinUrl, existing.linkedinUrl)},
      instagram_url = ${trimOrKeep(input.instagramUrl, existing.instagramUrl)},
      facebook_url = ${trimOrKeep(input.facebookUrl, existing.facebookUrl)},
      x_url = ${trimOrKeep(input.xUrl, existing.xUrl)},
      website_url = ${trimOrKeep(input.websiteUrl, existing.websiteUrl)},
      notes = ${trimOrKeep(input.notes, existing.notes)},
      is_primary = ${input.isPrimary !== undefined ? !!input.isPrimary : existing.isPrimary},
      updated_at = now()
    WHERE id = ${id}
    RETURNING
      id, target_id AS "targetId", name,
      first_name AS "firstName", last_name AS "lastName",
      email, phone, phone_mobile AS "phoneMobile",
      role_title AS "roleTitle", preferred_times AS "preferredTimes",
      linkedin_url AS "linkedinUrl", instagram_url AS "instagramUrl",
      facebook_url AS "facebookUrl", x_url AS "xUrl", website_url AS "websiteUrl",
      notes,
      COALESCE(is_primary, false) AS "isPrimary",
      created_at AS "createdAt", updated_at AS "updatedAt"
  `;
  return rows[0] ?? null;
};

export const deleteOutreachContact = async (id: string): Promise<boolean> => {
  await ensureMarketingOutreachTable();
  const { rowCount } = await sql`
    DELETE FROM marketing_outreach_contacts WHERE id = ${id}
  `;
  return (rowCount ?? 0) > 0;
};

export const listOutreachActivities = async (
  targetId: string,
  limit = 50
): Promise<OutreachActivity[]> => {
  await ensureMarketingOutreachTable();
  const { rows } = await sql<{
    id: string;
    targetId: string;
    contactId: string | null;
    kind: string;
    subject: string | null;
    bodyPreview: string | null;
    meta: Record<string, unknown> | null;
    createdByEmail: string | null;
    createdAt: string;
  }>`
    SELECT
      id, target_id AS "targetId", contact_id AS "contactId",
      kind, subject, body_preview AS "bodyPreview",
      COALESCE(meta, '{}'::jsonb) AS meta,
      created_by_email AS "createdByEmail",
      created_at AS "createdAt"
    FROM marketing_outreach_activities
    WHERE target_id = ${targetId}
    ORDER BY created_at DESC
    LIMIT ${Math.min(Math.max(limit, 1), 100)}
  `;
  return rows.map((r) => ({
    ...r,
    meta: (r.meta && typeof r.meta === "object" ? r.meta : {}) as Record<string, unknown>
  }));
};

export const listAllOutreachActivities = async (): Promise<OutreachActivity[]> => {
  await ensureMarketingOutreachTable();
  const { rows } = await sql<{
    id: string;
    targetId: string;
    contactId: string | null;
    kind: string;
    subject: string | null;
    bodyPreview: string | null;
    meta: Record<string, unknown> | null;
    createdByEmail: string | null;
    createdAt: string;
  }>`
    SELECT
      id, target_id AS "targetId", contact_id AS "contactId",
      kind, subject, body_preview AS "bodyPreview",
      COALESCE(meta, '{}'::jsonb) AS meta,
      created_by_email AS "createdByEmail",
      created_at AS "createdAt"
    FROM marketing_outreach_activities
    ORDER BY created_at DESC
  `;
  return rows.map((r) => ({
    ...r,
    meta: (r.meta && typeof r.meta === "object" ? r.meta : {}) as Record<string, unknown>
  }));
};

export const createOutreachActivity = async (input: {
  targetId: string;
  contactId?: string | null;
  kind: string;
  subject?: string | null;
  bodyPreview?: string | null;
  meta?: Record<string, unknown> | null;
  createdByEmail?: string | null;
}): Promise<OutreachActivity> => {
  await ensureMarketingOutreachTable();
  const metaJson = JSON.stringify(input.meta ?? {});
  const { rows } = await sql<{
    id: string;
    targetId: string;
    contactId: string | null;
    kind: string;
    subject: string | null;
    bodyPreview: string | null;
    meta: Record<string, unknown> | null;
    createdByEmail: string | null;
    createdAt: string;
  }>`
    INSERT INTO marketing_outreach_activities
      (target_id, contact_id, kind, subject, body_preview, meta, created_by_email)
    VALUES (
      ${input.targetId},
      ${input.contactId ?? null},
      ${input.kind},
      ${input.subject ?? null},
      ${input.bodyPreview ?? null},
      CAST(${metaJson} AS jsonb),
      ${input.createdByEmail ?? null}
    )
    RETURNING
      id, target_id AS "targetId", contact_id AS "contactId",
      kind, subject, body_preview AS "bodyPreview",
      COALESCE(meta, '{}'::jsonb) AS meta,
      created_by_email AS "createdByEmail",
      created_at AS "createdAt"
  `;
  const r = rows[0];
  return {
    ...r,
    meta: (r.meta && typeof r.meta === "object" ? r.meta : {}) as Record<string, unknown>
  };
};

let emailStaffListsTableReady = false;

const ensureEmailStaffListsTable = async () => {
  if (emailStaffListsTableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS email_staff_lists (
      list_key text PRIMARY KEY,
      emails text[] NOT NULL DEFAULT ARRAY[]::text[],
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  emailStaffListsTableReady = true;
};

export type EmailStaffListRow = {
  key: EmailStaffListKey;
  emails: string[];
  updatedAt: string | null;
  seededFromDefaults: boolean;
};

/** Ensure each list key exists; seed missing rows from env/hardcoded defaults. */
export const ensureEmailStaffListsSeeded = async (): Promise<void> => {
  await ensureEmailStaffListsTable();
  for (const key of EMAIL_STAFF_LIST_KEYS) {
    const { rows } = await sql<{ list_key: string }>`
      SELECT list_key FROM email_staff_lists WHERE list_key = ${key} LIMIT 1
    `;
    if (rows.length) continue;
    const emails = defaultEmailsForList(key);
    await sql`
      INSERT INTO email_staff_lists (list_key, emails, updated_at)
      VALUES (${key}, ${toPgArray(emails)}::text[], now())
      ON CONFLICT (list_key) DO NOTHING
    `;
  }
};

export const getEmailStaffList = async (key: EmailStaffListKey): Promise<string[]> => {
  await ensureEmailStaffListsSeeded();
  const { rows } = await sql<{ emails: string[] | null }>`
    SELECT COALESCE(emails, ARRAY[]::text[]) AS emails
    FROM email_staff_lists
    WHERE list_key = ${key}
    LIMIT 1
  `;
  if (!rows[0]) return defaultEmailsForList(key);
  return normalizeEmailList(rows[0].emails || []);
};

export const listEmailStaffLists = async (): Promise<EmailStaffListRow[]> => {
  await ensureEmailStaffListsSeeded();
  const { rows } = await sql<{
    list_key: string;
    emails: string[] | null;
    updated_at: string;
  }>`
    SELECT list_key, COALESCE(emails, ARRAY[]::text[]) AS emails, updated_at
    FROM email_staff_lists
    ORDER BY list_key
  `;
  const byKey = new Map(rows.map((r) => [r.list_key, r]));
  return EMAIL_STAFF_LIST_KEYS.map((key) => {
    const row = byKey.get(key);
    return {
      key,
      emails: normalizeEmailList(row?.emails || defaultEmailsForList(key)),
      updatedAt: row?.updated_at ?? null,
      seededFromDefaults: !row
    };
  });
};

export const saveEmailStaffList = async (
  key: EmailStaffListKey,
  emails: string[]
): Promise<string[]> => {
  await ensureEmailStaffListsTable();
  const normalized = normalizeEmailList(emails);
  await sql`
    INSERT INTO email_staff_lists (list_key, emails, updated_at)
    VALUES (${key}, ${toPgArray(normalized)}::text[], now())
    ON CONFLICT (list_key) DO UPDATE
    SET emails = EXCLUDED.emails, updated_at = now()
  `;
  return normalized;
};

export const saveAllEmailStaffLists = async (
  lists: Partial<Record<EmailStaffListKey, string[]>>
): Promise<EmailStaffListRow[]> => {
  for (const key of EMAIL_STAFF_LIST_KEYS) {
    if (lists[key] !== undefined) {
      await saveEmailStaffList(key, lists[key] || []);
    }
  }
  return listEmailStaffLists();
};

export type OutreachEmailTemplate = {
  id: string;
  name: string;
  subject: string;
  bodyText: string;
  purpose: string | null;
  createdAt: string;
  updatedAt: string;
};

let outreachEmailTemplatesReady = false;

const ensureOutreachEmailTemplatesTable = async () => {
  if (outreachEmailTemplatesReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS outreach_email_templates (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      subject text NOT NULL,
      body_text text NOT NULL,
      purpose text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  outreachEmailTemplatesReady = true;
};

export const listOutreachEmailTemplates = async (): Promise<OutreachEmailTemplate[]> => {
  await ensureOutreachEmailTemplatesTable();
  const { rows } = await sql<OutreachEmailTemplate>`
    SELECT
      id, name, subject,
      body_text AS "bodyText",
      purpose,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM outreach_email_templates
    ORDER BY name ASC
  `;
  return rows;
};

export const createOutreachEmailTemplate = async (input: {
  name: string;
  subject: string;
  bodyText: string;
  purpose?: string | null;
}): Promise<OutreachEmailTemplate> => {
  await ensureOutreachEmailTemplatesTable();
  const { rows } = await sql<OutreachEmailTemplate>`
    INSERT INTO outreach_email_templates (name, subject, body_text, purpose)
    VALUES (
      ${input.name},
      ${input.subject},
      ${input.bodyText},
      ${input.purpose ?? null}
    )
    RETURNING
      id, name, subject,
      body_text AS "bodyText",
      purpose,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;
  return rows[0];
};

export const updateOutreachEmailTemplate = async (
  id: string,
  input: {
    name: string;
    subject: string;
    bodyText: string;
    purpose?: string | null;
  }
): Promise<OutreachEmailTemplate | null> => {
  await ensureOutreachEmailTemplatesTable();
  const { rows } = await sql<OutreachEmailTemplate>`
    UPDATE outreach_email_templates
    SET
      name = ${input.name},
      subject = ${input.subject},
      body_text = ${input.bodyText},
      purpose = ${input.purpose ?? null},
      updated_at = now()
    WHERE id = ${id}
    RETURNING
      id, name, subject,
      body_text AS "bodyText",
      purpose,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;
  return rows[0] ?? null;
};

export const deleteOutreachEmailTemplate = async (id: string): Promise<boolean> => {
  await ensureOutreachEmailTemplatesTable();
  const { rowCount } = await sql`
    DELETE FROM outreach_email_templates WHERE id = ${id}
  `;
  return (rowCount ?? 0) > 0;
};

export const seedOutreachEmailTemplates = async (): Promise<number> => {
  const { STARTER_OUTREACH_EMAIL_TEMPLATES } = await import("@/lib/marketing-reference");
  await ensureOutreachEmailTemplatesTable();
  const existing = await listOutreachEmailTemplates();
  const names = new Set(existing.map((t) => t.name.trim().toLowerCase()));
  let added = 0;
  for (const starter of STARTER_OUTREACH_EMAIL_TEMPLATES) {
    if (names.has(starter.name.trim().toLowerCase())) continue;
    await createOutreachEmailTemplate(starter);
    added += 1;
  }
  return added;
};

export type LgdIntakeRecord = {
  id: string;
  userId: string;
  facilitatorId: string | null;
  status: string;
  answers: unknown;
  scriptDraft: unknown | null;
  scriptDraftText: string | null;
  voiceId: string | null;
  frequencyBedId: string | null;
  priceCents: number | null;
  paidAt?: string | null;
  stripeCheckoutSessionId?: string | null;
  ownVoiceAudioUrl?: string | null;
  libraryItemId?: string | null;
  producedAudioUrl?: string | null;
  memberEditAuthorizedAt?: string | null;
  memberEditAuthorizedBy?: string | null;
  editHistory?: unknown;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
};

let lgdIntakesReady = false;

const ensureLgdIntakesTable = async () => {
  if (lgdIntakesReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS lgd_intakes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      facilitator_id uuid REFERENCES moderators(id) ON DELETE SET NULL,
      status text NOT NULL DEFAULT 'draft',
      answers jsonb NOT NULL DEFAULT '{}'::jsonb,
      script_draft jsonb,
      script_draft_text text,
      voice_id text,
      frequency_bed_id text,
      price_cents integer,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      submitted_at timestamptz,
      approved_at timestamptz
    )
  `;
  await sql`ALTER TABLE lgd_intakes ADD COLUMN IF NOT EXISTS paid_at timestamptz`;
  await sql`ALTER TABLE lgd_intakes ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text`;
  await sql`ALTER TABLE lgd_intakes ADD COLUMN IF NOT EXISTS own_voice_audio_url text`;
  await sql`ALTER TABLE lgd_intakes ADD COLUMN IF NOT EXISTS library_item_id uuid`;
  await sql`ALTER TABLE lgd_intakes ADD COLUMN IF NOT EXISTS produced_audio_url text`;
  await sql`ALTER TABLE lgd_intakes ADD COLUMN IF NOT EXISTS member_edit_authorized_at timestamptz`;
  await sql`ALTER TABLE lgd_intakes ADD COLUMN IF NOT EXISTS member_edit_authorized_by text`;
  await sql`ALTER TABLE lgd_intakes ADD COLUMN IF NOT EXISTS edit_history jsonb NOT NULL DEFAULT '[]'::jsonb`;
  await sql`CREATE INDEX IF NOT EXISTS lgd_intakes_user_id_idx ON lgd_intakes (user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS lgd_intakes_status_idx ON lgd_intakes (status)`;
  lgdIntakesReady = true;
};

export const getLatestLgdIntakeForUser = async (
  userId: string
): Promise<LgdIntakeRecord | null> => {
  await ensureLgdIntakesTable();
  const { rows } = await sql<LgdIntakeRecord>`
    SELECT
      id,
      user_id AS "userId",
      facilitator_id AS "facilitatorId",
      status,
      answers,
      script_draft AS "scriptDraft",
      script_draft_text AS "scriptDraftText",
      voice_id AS "voiceId",
      frequency_bed_id AS "frequencyBedId",
      price_cents AS "priceCents",
      paid_at AS "paidAt",
      stripe_checkout_session_id AS "stripeCheckoutSessionId",
      own_voice_audio_url AS "ownVoiceAudioUrl",
      member_edit_authorized_at AS "memberEditAuthorizedAt",
      member_edit_authorized_by AS "memberEditAuthorizedBy",
      edit_history AS "editHistory",
      created_at AS "createdAt",
      updated_at AS "updatedAt",
      submitted_at AS "submittedAt",
      approved_at AS "approvedAt"
    FROM lgd_intakes
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
};

/** Remove all LGD intakes for a user (admin cleanup). */
export const deleteLgdIntakesForUser = async (userId: string): Promise<number> => {
  await ensureLgdIntakesTable();
  const { rows } = await sql<{ id: string }>`
    DELETE FROM lgd_intakes
    WHERE user_id = ${userId}
    RETURNING id
  `;
  return rows.length;
};

/** Always create a fresh draft so admin/member can start another intake. */
export const createLgdIntakeDraft = async (
  userId: string,
  answers: unknown
): Promise<LgdIntakeRecord> => {
  await ensureLgdIntakesTable();
  const answersJson = JSON.stringify(answers);
  const { rows } = await sql<LgdIntakeRecord>`
    INSERT INTO lgd_intakes (user_id, status, answers)
    VALUES (${userId}, 'draft', CAST(${answersJson} AS jsonb))
    RETURNING
      id,
      user_id AS "userId",
      facilitator_id AS "facilitatorId",
      status,
      answers,
      script_draft AS "scriptDraft",
      script_draft_text AS "scriptDraftText",
      voice_id AS "voiceId",
      frequency_bed_id AS "frequencyBedId",
      price_cents AS "priceCents",
      paid_at AS "paidAt",
      stripe_checkout_session_id AS "stripeCheckoutSessionId",
      own_voice_audio_url AS "ownVoiceAudioUrl",
      created_at AS "createdAt",
      updated_at AS "updatedAt",
      submitted_at AS "submittedAt",
      approved_at AS "approvedAt"
  `;
  return rows[0];
};

export const updateLgdIntakeDraft = async (input: {
  id: string;
  userId: string;
  answers: unknown;
  voiceId?: string | null;
  frequencyBedId?: string | null;
}): Promise<LgdIntakeRecord | null> => {
  await ensureLgdIntakesTable();
  const answersJson = JSON.stringify(input.answers);
  const { rows } = await sql<LgdIntakeRecord>`
    UPDATE lgd_intakes
    SET
      answers = CAST(${answersJson} AS jsonb),
      voice_id = ${input.voiceId ?? null},
      frequency_bed_id = ${input.frequencyBedId ?? null},
      updated_at = now()
    WHERE id = ${input.id}
      AND user_id = ${input.userId}
      AND status = 'draft'
    RETURNING
      id,
      user_id AS "userId",
      facilitator_id AS "facilitatorId",
      status,
      answers,
      script_draft AS "scriptDraft",
      script_draft_text AS "scriptDraftText",
      voice_id AS "voiceId",
      frequency_bed_id AS "frequencyBedId",
      price_cents AS "priceCents",
      paid_at AS "paidAt",
      stripe_checkout_session_id AS "stripeCheckoutSessionId",
      own_voice_audio_url AS "ownVoiceAudioUrl",
      created_at AS "createdAt",
      updated_at AS "updatedAt",
      submitted_at AS "submittedAt",
      approved_at AS "approvedAt"
  `;
  return rows[0] ?? null;
};

export const submitLgdIntake = async (input: {
  id: string;
  userId: string;
  answers: unknown;
  scriptDraftText: string;
  scriptDraft?: unknown;
  voiceId?: string | null;
  frequencyBedId?: string | null;
  facilitatorId?: string | null;
  priceCents?: number | null;
  audit?: LgdIntakeEditAuditInput;
}): Promise<LgdIntakeRecord | null> => {
  await ensureLgdIntakesTable();
  const answersJson = JSON.stringify(input.answers);
  const scriptDraftJson = JSON.stringify(input.scriptDraft ?? null);
  const event = input.audit
    ? {
        at: new Date().toISOString(),
        byRole: input.audit.byRole,
        byEmail: input.audit.byEmail.trim().toLowerCase(),
        byName: input.audit.byName ?? null,
        action: "submit" as const,
        note: input.audit.note
      }
    : {
        at: new Date().toISOString(),
        byRole: "member" as const,
        byEmail: "unknown",
        byName: null,
        action: "submit" as const,
        note: "Submitted intake"
      };
  const eventJson = JSON.stringify([event]);
  await sql`
    UPDATE lgd_intakes
    SET
      answers = CAST(${answersJson} AS jsonb),
      script_draft = CAST(${scriptDraftJson} AS jsonb),
      script_draft_text = ${input.scriptDraftText},
      voice_id = ${input.voiceId ?? null},
      frequency_bed_id = ${input.frequencyBedId ?? null},
      facilitator_id = ${input.facilitatorId ?? null},
      price_cents = ${input.priceCents ?? null},
      status = 'submitted',
      submitted_at = now(),
      edit_history = COALESCE(edit_history, '[]'::jsonb) || CAST(${eventJson} AS jsonb),
      updated_at = now()
    WHERE id = ${input.id}
      AND user_id = ${input.userId}
      AND status = 'draft'
  `;
  return getLgdIntakeById(input.id);
};

export type LgdIntakeListItem = LgdIntakeRecord & {
  memberEmail: string;
  firstName: string | null;
  lastName: string | null;
};

export const listLgdIntakesForMemberEmails = async (
  emails: string[]
): Promise<LgdIntakeListItem[]> => {
  await ensureLgdIntakesTable();
  const unique = [
    ...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))
  ];
  if (!unique.length) return [];
  const { rows } = await sql<LgdIntakeListItem>`
    SELECT
      i.id,
      i.user_id AS "userId",
      i.facilitator_id AS "facilitatorId",
      i.status,
      i.answers,
      i.script_draft AS "scriptDraft",
      i.script_draft_text AS "scriptDraftText",
      i.voice_id AS "voiceId",
      i.frequency_bed_id AS "frequencyBedId",
      i.price_cents AS "priceCents",
      i.paid_at AS "paidAt",
      i.own_voice_audio_url AS "ownVoiceAudioUrl",
      i.library_item_id AS "libraryItemId",
      i.produced_audio_url AS "producedAudioUrl",
      i.member_edit_authorized_at AS "memberEditAuthorizedAt",
      i.member_edit_authorized_by AS "memberEditAuthorizedBy",
      i.edit_history AS "editHistory",
      i.created_at AS "createdAt",
      i.updated_at AS "updatedAt",
      i.submitted_at AS "submittedAt",
      i.approved_at AS "approvedAt",
      u.email AS "memberEmail",
      mp.first_name AS "firstName",
      mp.last_name AS "lastName"
    FROM lgd_intakes i
    JOIN users u ON u.id = i.user_id
    LEFT JOIN member_profiles mp ON mp.user_id = u.id
    WHERE LOWER(u.email) = ANY(${toPgArray(unique)}::text[])
      AND i.status <> 'draft'
    ORDER BY COALESCE(i.submitted_at, i.updated_at) DESC
  `;
  return rows;
};

export const getLgdIntakeById = async (id: string): Promise<LgdIntakeRecord | null> => {
  await ensureLgdIntakesTable();
  const { rows } = await sql<LgdIntakeRecord>`
    SELECT
      id,
      user_id AS "userId",
      facilitator_id AS "facilitatorId",
      status,
      answers,
      script_draft AS "scriptDraft",
      script_draft_text AS "scriptDraftText",
      voice_id AS "voiceId",
      frequency_bed_id AS "frequencyBedId",
      price_cents AS "priceCents",
      paid_at AS "paidAt",
      stripe_checkout_session_id AS "stripeCheckoutSessionId",
      own_voice_audio_url AS "ownVoiceAudioUrl",
      library_item_id AS "libraryItemId",
      produced_audio_url AS "producedAudioUrl",
      member_edit_authorized_at AS "memberEditAuthorizedAt",
      member_edit_authorized_by AS "memberEditAuthorizedBy",
      edit_history AS "editHistory",
      created_at AS "createdAt",
      updated_at AS "updatedAt",
      submitted_at AS "submittedAt",
      approved_at AS "approvedAt"
    FROM lgd_intakes
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
};

/** Link a produced CGMR library item to the intake and mark complete. */
export const linkLgdIntakeCgmrLibraryItem = async (input: {
  id: string;
  libraryItemId: string;
  producedAudioUrl: string;
}): Promise<LgdIntakeRecord | null> => {
  await ensureLgdIntakesTable();
  await sql`
    UPDATE lgd_intakes
    SET
      library_item_id = ${input.libraryItemId}::uuid,
      produced_audio_url = ${input.producedAudioUrl},
      status = 'complete',
      updated_at = now()
    WHERE id = ${input.id}
  `;
  return getLgdIntakeById(input.id);
};

export type LgdIntakeEditAuditInput = {
  byRole: "admin" | "member" | "facilitator";
  byEmail: string;
  byName?: string | null;
  action:
    | "save_answers"
    | "submit"
    | "authorize_member_edit"
    | "revoke_member_edit"
    | "create_draft";
  note?: string;
};

/** Save answers on draft or submitted intake; appends who/when to edit_history. */
export const updateLgdIntakeAnswersWithAudit = async (input: {
  id: string;
  userId: string;
  answers: unknown;
  voiceId?: string | null;
  frequencyBedId?: string | null;
  scriptDraftText?: string | null;
  scriptDraft?: unknown;
  audit: LgdIntakeEditAuditInput;
}): Promise<LgdIntakeRecord | null> => {
  await ensureLgdIntakesTable();
  const existing = await getLgdIntakeById(input.id);
  if (!existing || existing.userId !== input.userId) return null;
  if (existing.status === "cancelled") return null;

  const answersJson = JSON.stringify(input.answers);
  const event = {
    at: new Date().toISOString(),
    byRole: input.audit.byRole,
    byEmail: input.audit.byEmail.trim().toLowerCase(),
    byName: input.audit.byName ?? null,
    action: input.audit.action,
    note: input.audit.note
  };
  const eventJson = JSON.stringify([event]);
  const hasScript = input.scriptDraftText !== undefined;
  const scriptDraftJson = JSON.stringify(input.scriptDraft ?? null);

  if (hasScript) {
    await sql`
      UPDATE lgd_intakes
      SET
        answers = CAST(${answersJson} AS jsonb),
        voice_id = ${input.voiceId ?? null},
        frequency_bed_id = ${input.frequencyBedId ?? null},
        script_draft = CAST(${scriptDraftJson} AS jsonb),
        script_draft_text = ${input.scriptDraftText ?? null},
        edit_history = COALESCE(edit_history, '[]'::jsonb) || CAST(${eventJson} AS jsonb),
        updated_at = now()
      WHERE id = ${input.id}
        AND user_id = ${input.userId}
        AND status <> 'cancelled'
    `;
  } else {
    await sql`
      UPDATE lgd_intakes
      SET
        answers = CAST(${answersJson} AS jsonb),
        voice_id = ${input.voiceId ?? null},
        frequency_bed_id = ${input.frequencyBedId ?? null},
        edit_history = COALESCE(edit_history, '[]'::jsonb) || CAST(${eventJson} AS jsonb),
        updated_at = now()
      WHERE id = ${input.id}
        AND user_id = ${input.userId}
        AND status <> 'cancelled'
    `;
  }
  return getLgdIntakeById(input.id);
};

export const setLgdMemberFormEditAuthorization = async (input: {
  id: string;
  authorized: boolean;
  audit: LgdIntakeEditAuditInput;
}): Promise<LgdIntakeRecord | null> => {
  await ensureLgdIntakesTable();
  const existing = await getLgdIntakeById(input.id);
  if (!existing) return null;
  const event = {
    at: new Date().toISOString(),
    byRole: input.audit.byRole,
    byEmail: input.audit.byEmail.trim().toLowerCase(),
    byName: input.audit.byName ?? null,
    action: input.authorized ? ("authorize_member_edit" as const) : ("revoke_member_edit" as const),
    note: input.audit.note
  };
  const eventJson = JSON.stringify([event]);
  const authBy = input.authorized ? input.audit.byEmail.trim().toLowerCase() : null;
  await sql`
    UPDATE lgd_intakes
    SET
      member_edit_authorized_at = ${input.authorized ? event.at : null},
      member_edit_authorized_by = ${authBy},
      edit_history = COALESCE(edit_history, '[]'::jsonb) || CAST(${eventJson} AS jsonb),
      updated_at = now()
    WHERE id = ${input.id}
  `;
  return getLgdIntakeById(input.id);
};

export const updateLgdIntakeByFacilitator = async (input: {
  id: string;
  status?: string;
  scriptDraftText?: string | null;
  facilitatorId?: string | null;
}): Promise<LgdIntakeRecord | null> => {
  await ensureLgdIntakesTable();
  const existing = await getLgdIntakeById(input.id);
  if (!existing) return null;
  const nextStatus = input.status ?? existing.status;
  const nextScript =
    input.scriptDraftText !== undefined ? input.scriptDraftText : existing.scriptDraftText;
  const nextFacilitatorId =
    input.facilitatorId !== undefined ? input.facilitatorId : existing.facilitatorId;
  const approvedAt =
    nextStatus === "approved" && !existing.approvedAt
      ? new Date().toISOString()
      : existing.approvedAt;
  const { rows } = await sql<LgdIntakeRecord>`
    UPDATE lgd_intakes
    SET
      status = ${nextStatus},
      script_draft_text = ${nextScript},
      facilitator_id = ${nextFacilitatorId},
      approved_at = ${approvedAt},
      updated_at = now()
    WHERE id = ${input.id}
    RETURNING
      id,
      user_id AS "userId",
      facilitator_id AS "facilitatorId",
      status,
      answers,
      script_draft AS "scriptDraft",
      script_draft_text AS "scriptDraftText",
      voice_id AS "voiceId",
      frequency_bed_id AS "frequencyBedId",
      price_cents AS "priceCents",
      created_at AS "createdAt",
      updated_at AS "updatedAt",
      submitted_at AS "submittedAt",
      approved_at AS "approvedAt"
  `;
  return rows[0] ?? null;
};

let facilitatorLgdSettingsReady = false;

const ensureFacilitatorLgdSettingsTable = async () => {
  if (facilitatorLgdSettingsReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS facilitator_lgd_settings (
      moderator_id uuid PRIMARY KEY REFERENCES moderators(id) ON DELETE CASCADE,
      flags jsonb NOT NULL DEFAULT '{}'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  facilitatorLgdSettingsReady = true;
};

export const getFacilitatorLgdSettings = async (
  moderatorId: string
): Promise<Record<string, boolean>> => {
  await ensureFacilitatorLgdSettingsTable();
  const { rows } = await sql<{ flags: Record<string, boolean> | null }>`
    SELECT flags FROM facilitator_lgd_settings WHERE moderator_id = ${moderatorId} LIMIT 1
  `;
  return rows[0]?.flags && typeof rows[0].flags === "object" ? rows[0].flags : {};
};

export const upsertFacilitatorLgdSettings = async (
  moderatorId: string,
  flags: Record<string, boolean>
): Promise<Record<string, boolean>> => {
  await ensureFacilitatorLgdSettingsTable();
  const flagsJson = JSON.stringify(flags);
  const { rows } = await sql<{ flags: Record<string, boolean> }>`
    INSERT INTO facilitator_lgd_settings (moderator_id, flags, updated_at)
    VALUES (${moderatorId}, CAST(${flagsJson} AS jsonb), now())
    ON CONFLICT (moderator_id) DO UPDATE SET
      flags = EXCLUDED.flags,
      updated_at = now()
    RETURNING flags
  `;
  return rows[0]?.flags ?? flags;
};

export const listAllLgdIntakes = async (): Promise<LgdIntakeListItem[]> => {
  await ensureLgdIntakesTable();
  const { rows } = await sql<LgdIntakeListItem>`
    SELECT
      i.id,
      i.user_id AS "userId",
      i.facilitator_id AS "facilitatorId",
      i.status,
      i.answers,
      i.script_draft AS "scriptDraft",
      i.script_draft_text AS "scriptDraftText",
      i.voice_id AS "voiceId",
      i.frequency_bed_id AS "frequencyBedId",
      i.price_cents AS "priceCents",
      i.paid_at AS "paidAt",
      i.stripe_checkout_session_id AS "stripeCheckoutSessionId",
      i.own_voice_audio_url AS "ownVoiceAudioUrl",
      i.library_item_id AS "libraryItemId",
      i.produced_audio_url AS "producedAudioUrl",
      i.member_edit_authorized_at AS "memberEditAuthorizedAt",
      i.member_edit_authorized_by AS "memberEditAuthorizedBy",
      i.edit_history AS "editHistory",
      i.created_at AS "createdAt",
      i.updated_at AS "updatedAt",
      i.submitted_at AS "submittedAt",
      i.approved_at AS "approvedAt",
      u.email AS "memberEmail",
      mp.first_name AS "firstName",
      mp.last_name AS "lastName"
    FROM lgd_intakes i
    JOIN users u ON u.id = i.user_id
    LEFT JOIN member_profiles mp ON mp.user_id = u.id
    ORDER BY
      CASE WHEN i.status = 'draft' THEN 1 ELSE 0 END,
      COALESCE(i.submitted_at, i.updated_at) DESC
    LIMIT 200
  `;
  return rows;
};

export const markLgdIntakePaid = async (input: {
  id: string;
  stripeCheckoutSessionId: string;
  priceCents: number;
}): Promise<LgdIntakeRecord | null> => {
  await ensureLgdIntakesTable();
  const { rows } = await sql<LgdIntakeRecord>`
    UPDATE lgd_intakes
    SET
      paid_at = now(),
      stripe_checkout_session_id = ${input.stripeCheckoutSessionId},
      price_cents = ${input.priceCents},
      updated_at = now()
    WHERE id = ${input.id}
    RETURNING
      id,
      user_id AS "userId",
      facilitator_id AS "facilitatorId",
      status,
      answers,
      script_draft AS "scriptDraft",
      script_draft_text AS "scriptDraftText",
      voice_id AS "voiceId",
      frequency_bed_id AS "frequencyBedId",
      price_cents AS "priceCents",
      paid_at AS "paidAt",
      stripe_checkout_session_id AS "stripeCheckoutSessionId",
      own_voice_audio_url AS "ownVoiceAudioUrl",
      created_at AS "createdAt",
      updated_at AS "updatedAt",
      submitted_at AS "submittedAt",
      approved_at AS "approvedAt"
  `;
  return rows[0] ?? null;
};

export const setLgdIntakeOwnVoiceAudioUrl = async (
  id: string,
  userId: string,
  url: string
): Promise<boolean> => {
  await ensureLgdIntakesTable();
  const { rowCount } = await sql`
    UPDATE lgd_intakes
    SET own_voice_audio_url = ${url}, updated_at = now()
    WHERE id = ${id} AND user_id = ${userId}
  `;
  return (rowCount ?? 0) > 0;
};

export type SiteCopyKind = "goal" | "topic" | "blog";

export type SiteCopyOverrideRecord = {
  path: string;
  kind: SiteCopyKind;
  content: Record<string, unknown>;
  updatedAt: string;
  updatedBy: string | null;
};

let siteCopyOverridesReady = false;

const ensureSiteCopyOverridesTable = async () => {
  if (siteCopyOverridesReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS site_copy_overrides (
      path text PRIMARY KEY,
      kind text NOT NULL,
      content jsonb NOT NULL DEFAULT '{}'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT now(),
      updated_by text
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS site_copy_overrides_kind_idx ON site_copy_overrides (kind)`;
  siteCopyOverridesReady = true;
};

function parseSiteCopyRow(row: {
  path: string;
  kind: string;
  content: unknown;
  updatedAt: string;
  updatedBy: string | null;
}): SiteCopyOverrideRecord {
  const content =
    row.content && typeof row.content === "object" && !Array.isArray(row.content)
      ? (row.content as Record<string, unknown>)
      : {};
  const kind: SiteCopyKind =
    row.kind === "goal" || row.kind === "topic" || row.kind === "blog" ? row.kind : "blog";
  return {
    path: row.path,
    kind,
    content,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy
  };
}

export const listSiteCopyOverrides = async (): Promise<SiteCopyOverrideRecord[]> => {
  await ensureSiteCopyOverridesTable();
  const { rows } = await sql<{
    path: string;
    kind: string;
    content: unknown;
    updatedAt: string;
    updatedBy: string | null;
  }>`
    SELECT
      path,
      kind,
      content,
      updated_at AS "updatedAt",
      updated_by AS "updatedBy"
    FROM site_copy_overrides
    ORDER BY path ASC
  `;
  return rows.map(parseSiteCopyRow);
};

export const getSiteCopyOverride = async (
  path: string
): Promise<SiteCopyOverrideRecord | null> => {
  await ensureSiteCopyOverridesTable();
  const { rows } = await sql<{
    path: string;
    kind: string;
    content: unknown;
    updatedAt: string;
    updatedBy: string | null;
  }>`
    SELECT
      path,
      kind,
      content,
      updated_at AS "updatedAt",
      updated_by AS "updatedBy"
    FROM site_copy_overrides
    WHERE path = ${path}
    LIMIT 1
  `;
  return rows[0] ? parseSiteCopyRow(rows[0]) : null;
};

export const upsertSiteCopyOverride = async (input: {
  path: string;
  kind: SiteCopyKind;
  content: Record<string, unknown>;
  updatedBy: string | null;
}): Promise<SiteCopyOverrideRecord> => {
  await ensureSiteCopyOverridesTable();
  const contentJson = JSON.stringify(input.content);
  const { rows } = await sql<{
    path: string;
    kind: string;
    content: unknown;
    updatedAt: string;
    updatedBy: string | null;
  }>`
    INSERT INTO site_copy_overrides (path, kind, content, updated_by, updated_at)
    VALUES (
      ${input.path},
      ${input.kind},
      CAST(${contentJson} AS jsonb),
      ${input.updatedBy},
      now()
    )
    ON CONFLICT (path) DO UPDATE SET
      kind = EXCLUDED.kind,
      content = EXCLUDED.content,
      updated_by = EXCLUDED.updated_by,
      updated_at = now()
    RETURNING
      path,
      kind,
      content,
      updated_at AS "updatedAt",
      updated_by AS "updatedBy"
  `;
  return parseSiteCopyRow(rows[0]);
};

export const deleteSiteCopyOverride = async (path: string): Promise<boolean> => {
  await ensureSiteCopyOverridesTable();
  const { rowCount } = await sql`
    DELETE FROM site_copy_overrides WHERE path = ${path}
  `;
  return (rowCount ?? 0) > 0;
};
