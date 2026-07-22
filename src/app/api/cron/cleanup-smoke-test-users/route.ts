import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import {
  deleteSmokeTestUsersOlderThanDays,
  SMOKE_TEST_USER_MIN_AGE_DAYS
} from "@/lib/smoke-test-users";

/**
 * Daily cleanup of automated smoke-test member accounts (Vercel Cron).
 * Deletes accounts matching smoke-test patterns that are older than one day.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const { deletedCount, emails, allowedListItemsUpdated } =
    await deleteSmokeTestUsersOlderThanDays(SMOKE_TEST_USER_MIN_AGE_DAYS);

  console.info(
    "[cron cleanup-smoke-test-users]",
    JSON.stringify({
      minAgeDays: SMOKE_TEST_USER_MIN_AGE_DAYS,
      deletedCount,
      emails,
      allowedListItemsUpdated
    })
  );

  return NextResponse.json({
    ok: true,
    startedAt,
    finishedAt: new Date().toISOString(),
    minAgeDays: SMOKE_TEST_USER_MIN_AGE_DAYS,
    deletedCount,
    emails,
    allowedListItemsUpdated
  });
}
