import { sql } from "@vercel/postgres";

export type DbUser = {
  id: string;
  email: string;
  password_hash: string;
  goal_ids: string[] | null;
  created_at: string;
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
  subscriptionStatus: DbSubscription["status"] | null;
  subscriptionTier: DbSubscription["tier"] | null;
};

export const getUserByEmail = async (email: string) => {
  const { rows } = await sql<DbUser>`
    SELECT id, email, password_hash, goal_ids, created_at
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
    RETURNING id, email, password_hash, goal_ids, created_at
  `;
  return rows[0];
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
  const { rows } = await sql<DbUser>`
    UPDATE users
    SET goal_ids = ${sql.array(goalIds, "text")}
    WHERE id = ${userId}
    RETURNING id, email, password_hash, goal_ids, created_at
  `;
  return rows[0];
};

export const getUserProfile = async (email: string) => {
  const { rows } = await sql<UserProfile>`
    SELECT
      u.id,
      u.email,
      COALESCE(u.goal_ids, ARRAY[]::text[]) AS "goalIds",
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
      s.status AS "subscriptionStatus",
      s.tier AS "subscriptionTier"
    FROM users u
    LEFT JOIN subscriptions s ON s.user_id = u.id
    ORDER BY u.created_at DESC
  `;
  return rows;
};
