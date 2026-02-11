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
  hadLgdSession?: boolean | null;
  referralSource?: string | null;
};

export type DbSubscription = {
  id: string;
  user_id: string;
  status: "inactive" | "active" | "past_due" | "canceled";
  tier: "bronze" | "gold" | "platinum";
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
};

export const getUserByEmail = async (email: string) => {
  const { rows } = await sql<DbUser>`
    SELECT id, email, password_hash, goal_ids, goal_updated_at, plays_per_night, created_at
    FROM users
    WHERE LOWER(email) = LOWER(${email})
    LIMIT 1
  `;
  return rows[0] || null;
};

export const createUser = async (email: string, passwordHash: string) => {
  const { rows } = await sql<DbUser>`
    INSERT INTO users (email, password_hash)
    VALUES (${email}, ${passwordHash})
    RETURNING id, email, password_hash, goal_ids, goal_updated_at, plays_per_night, created_at
  `;
  return rows[0];
};

export const deleteUserByEmail = async (email: string) => {
  await sql`
    DELETE FROM users
    WHERE LOWER(email) = LOWER(${email})
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

export const upsertMemberProfile = async (profile: MemberProfile) => {
  await sql`
    INSERT INTO member_profiles (
      user_id,
      first_name,
      last_name,
      gender,
      year_born,
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
      had_lgd_session,
      referral_source
    )
    VALUES (
      ${profile.userId},
      ${profile.firstName || null},
      ${profile.lastName || null},
      ${profile.gender || null},
      ${profile.yearBorn || null},
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
      ${profile.hadLgdSession ?? false},
      ${profile.referralSource || null}
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      gender = EXCLUDED.gender,
      year_born = EXCLUDED.year_born,
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
      had_lgd_session = EXCLUDED.had_lgd_session,
      referral_source = EXCLUDED.referral_source,
      updated_at = now()
  `;
};

export const getMemberProfileByUserId = async (userId: string) => {
  const { rows } = await sql<MemberProfile>`
    SELECT
      user_id as "userId",
      first_name as "firstName",
      last_name as "lastName",
      gender,
      year_born as "yearBorn",
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
      had_lgd_session as "hadLgdSession",
      referral_source as "referralSource"
    FROM member_profiles
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  return rows[0] || null;
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
      s.tier AS "subscriptionTier"
    FROM users u
    LEFT JOIN subscriptions s ON s.user_id = u.id
    WHERE LOWER(u.email) = LOWER(${email})
    LIMIT 1
  `;
  return rows[0] || null;
};

export const listUsers = async () => {
  const { rows } = await sql<UserProfile>`
    SELECT
      u.id,
      u.email,
      COALESCE(u.goal_ids, ARRAY[]::text[]) AS "goalIds",
      u.goal_updated_at AS "goalUpdatedAt",
      COALESCE(u.plays_per_night, 2) AS "playsPerNight",
      s.status AS "subscriptionStatus",
      s.tier AS "subscriptionTier"
    FROM users u
    LEFT JOIN subscriptions s ON s.user_id = u.id
    ORDER BY u.created_at DESC
  `;
  return rows;
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

export const listAdmins = async () => {
  const { rows } = await sql<AdminAccount>`
    SELECT id, email, password_hash as "passwordHash", status, created_at as "createdAt"
    FROM admins
    ORDER BY created_at ASC
  `;
  return rows;
};

export const getAdminByEmail = async (email: string) => {
  const { rows } = await sql<AdminAccount>`
    SELECT
      id,
      email,
      password_hash as "passwordHash",
      status,
      created_at as "createdAt"
    FROM admins
    WHERE LOWER(email) = LOWER(${email})
    LIMIT 1
  `;
  return rows[0] || null;
};

export const createAdmin = async (email: string, passwordHash: string) => {
  const { rows } = await sql<AdminAccount>`
    INSERT INTO admins (email, password_hash, status)
    VALUES (${email}, ${passwordHash}, 'active')
    RETURNING
      id,
      email,
      password_hash as "passwordHash",
      status,
      created_at as "createdAt"
  `;
  return rows[0];
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
  const { rows } = await sql<{ count: number }>`
    SELECT COUNT(*)::int AS count FROM subscription_plans
  `;
  if (rows[0]?.count) {
    return;
  }
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

const ensureLibrarySeeded = async () => {
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
          (title, description, sku_code, categories, cover_url, audio_url, interest_ids, allowed_user_emails, order_index, is_adult)
        VALUES
          (${item.title}, ${item.description}, ${item.skuCode || ""}, ${toPgArray(item.categories || [])}::text[],
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
    const { rows } = await sql<Interest>`
      SELECT id, name, description,
        audio_id_a as "audioIdA",
        audio_id_b as "audioIdB",
        audio_id_c as "audioIdC",
        created_at as "createdAt"
      FROM interests
      ORDER BY name ASC
    `;
    return rows;
  } catch {
    const { rows } = await sql<Interest>`
      SELECT id, name, description, created_at as "createdAt"
      FROM interests
      ORDER BY name ASC
    `;
    return rows.map((r) => ({ ...r, audioIdA: null, audioIdB: null, audioIdC: null }));
  }
};

export const updateInterest = async (
  id: string,
  name: string,
  description?: string,
  audioIds?: { a?: string | null; b?: string | null; c?: string | null }
) => {
  if (audioIds !== undefined) {
    try {
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
    } catch {
      // Columns may not exist yet (migration not run)
    }
  }
  const { rows } = await sql<Interest>`
    UPDATE interests
    SET name = ${name}, description = ${description || ""}
    WHERE id = ${id}
    RETURNING id, name, description, created_at as "createdAt"
  `;
  return rows[0] || null;
};

export const createInterest = async (name: string, description?: string) => {
  const id = crypto.randomUUID();
  const { rows } = await sql<Interest>`
    INSERT INTO interests (id, name, description, created_at)
    VALUES (${id}, ${name}, ${description || ""}, now())
    RETURNING id, name, description, created_at as "createdAt"
  `;
  return rows[0];
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
      COALESCE(categories, ARRAY[]::text[]) as "categories",
      cover_url as "coverUrl",
      audio_url as "audioUrl",
      COALESCE(interest_ids, ARRAY[]::text[]) as "interestIds",
      COALESCE(allowed_user_emails, ARRAY[]::text[]) as "allowedUserEmails",
      created_at as "createdAt",
      order_index as "order",
      is_adult as "isAdult"
    FROM library_items
    ORDER BY order_index ASC
  `;
  return rows;
};

export const listPersonalizedLibraryForUser = async (email: string) => {
  await ensureLibrarySeeded();
  const { rows } = await sql<LibraryItem>`
    SELECT
      id,
      title,
      description,
      sku_code as "skuCode",
      COALESCE(categories, ARRAY[]::text[]) as "categories",
      cover_url as "coverUrl",
      audio_url as "audioUrl",
      COALESCE(interest_ids, ARRAY[]::text[]) as "interestIds",
      COALESCE(allowed_user_emails, ARRAY[]::text[]) as "allowedUserEmails",
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
    ORDER BY order_index ASC
  `;
  return rows;
};

export const getLibraryItem = async (id: string) => {
  await ensureLibrarySeeded();
  const { rows } = await sql<LibraryItem>`
    SELECT
      id,
      title,
      description,
      sku_code as "skuCode",
      COALESCE(categories, ARRAY[]::text[]) as "categories",
      cover_url as "coverUrl",
      audio_url as "audioUrl",
      COALESCE(interest_ids, ARRAY[]::text[]) as "interestIds",
      COALESCE(allowed_user_emails, ARRAY[]::text[]) as "allowedUserEmails",
      created_at as "createdAt",
      order_index as "order",
      is_adult as "isAdult"
    FROM library_items
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] || null;
};

export const createLibraryItem = async (payload: {
  title: string;
  description: string;
  skuCode: string;
  categories: string[];
  coverUrl: string;
  audioUrl: string;
  interestIds: string[];
  allowedUserEmails: string[];
}) => {
  const { rows: orderRows } = await sql<{ max: number }>`
    SELECT COALESCE(MAX(order_index), 0)::int as max FROM library_items
  `;
  const order = (orderRows[0]?.max || 0) + 1;
  const { rows } = await sql<LibraryItem>`
    INSERT INTO library_items
      (title, description, sku_code, categories, cover_url, audio_url, interest_ids, allowed_user_emails, order_index, is_adult)
    VALUES
      (${payload.title}, ${payload.description}, ${payload.skuCode}, ${toPgArray(payload.categories)}::text[],
       ${payload.coverUrl}, ${payload.audioUrl},
       ${toPgArray(payload.interestIds)}::text[], ${toPgArray(payload.allowedUserEmails)}::text[],
       ${order}, false)
    RETURNING
      id,
      title,
      description,
      sku_code as "skuCode",
      COALESCE(categories, ARRAY[]::text[]) as "categories",
      cover_url as "coverUrl",
      audio_url as "audioUrl",
      COALESCE(interest_ids, ARRAY[]::text[]) as "interestIds",
      COALESCE(allowed_user_emails, ARRAY[]::text[]) as "allowedUserEmails",
      created_at as "createdAt",
      order_index as "order",
      is_adult as "isAdult"
  `;
  return rows[0];
};

export const updateLibraryItem = async (payload: {
  id: string;
  title: string;
  description: string;
  skuCode: string;
  categories: string[];
  coverUrl: string;
  audioUrl: string;
  interestIds: string[];
  allowedUserEmails: string[];
  order?: number;
  isAdult?: boolean;
}) => {
  const { rows } = await sql<LibraryItem>`
    UPDATE library_items
    SET
      title = ${payload.title},
      description = ${payload.description},
      sku_code = ${payload.skuCode},
      categories = ${toPgArray(payload.categories)}::text[],
      cover_url = ${payload.coverUrl},
      audio_url = ${payload.audioUrl},
      interest_ids = ${toPgArray(payload.interestIds)}::text[],
      allowed_user_emails = ${toPgArray(payload.allowedUserEmails)}::text[],
      order_index = COALESCE(${payload.order ?? null}, order_index),
      is_adult = COALESCE(${payload.isAdult ?? null}, is_adult)
    WHERE id = ${payload.id}
    RETURNING
      id,
      title,
      description,
      sku_code as "skuCode",
      COALESCE(categories, ARRAY[]::text[]) as "categories",
      cover_url as "coverUrl",
      audio_url as "audioUrl",
      COALESCE(interest_ids, ARRAY[]::text[]) as "interestIds",
      COALESCE(allowed_user_emails, ARRAY[]::text[]) as "allowedUserEmails",
      created_at as "createdAt",
      order_index as "order",
      is_adult as "isAdult"
  `;
  return rows[0] || null;
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

export const listAffiliates = async () => {
  const { rows } = await sql<AffiliateRecord>`
    SELECT
      id,
      name,
      email,
      payout_address as "payoutAddress",
      created_at as "createdAt",
      status
    FROM affiliate_applications
    ORDER BY created_at DESC
  `;
  return rows;
};

export const createAffiliate = async (payload: {
  name: string;
  email: string;
  payoutAddress: string;
}) => {
  const { rows } = await sql<AffiliateRecord>`
    INSERT INTO affiliate_applications (name, email, payout_address, status)
    VALUES (${payload.name}, ${payload.email}, ${payload.payoutAddress}, 'pending')
    RETURNING
      id,
      name,
      email,
      payout_address as "payoutAddress",
      created_at as "createdAt",
      status
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
      status
  `;
  return rows[0] || null;
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
  await sql`DELETE FROM moderators WHERE id = ${moderatorId}`;
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
      status = EXCLUDED.status,
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

export const getModeratorApplicationBySlug = async (slug: string) => {
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
    WHERE LOWER(profile_slug) = LOWER(${slug})
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
  assignedUserEmails?: string[];
  status?: ModeratorAccount["status"];
  passwordHash?: string;
}) => {
  const { rows } = await sql<ModeratorAccount>`
    UPDATE moderators
    SET
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

export const listSubscriptionPlans = async () => {
  await ensureSubscriptionPlansSeeded();
  const { rows } = await sql<SubscriptionPlan>`
    SELECT id, name, price_id as "priceId", trial_days as "trialDays", description
    FROM subscription_plans
    ORDER BY id ASC
  `;
  return rows;
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
  return rows[0] || defaultPlaybackSettings;
};

export const savePlaybackSettings = async (settings: PlaybackSettings) => {
  await sql`
    INSERT INTO playback_settings
      (id, plays_per_recording, nightly_gap_hours, add_new_track_every_nights, initial_tracks, cgmr_track_id, fallback_track_id)
    VALUES
      (1, ${settings.playsPerRecording}, ${settings.nightlyGapHours},
       ${settings.addNewTrackEveryNights}, ${settings.initialTracks},
       ${settings.cgmrTrackId}, ${settings.fallbackTrackId})
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
