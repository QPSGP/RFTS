import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";

/**
 * Return a JSON error response with consistent shape.
 * Use for API routes: return apiError("Message", 400);
 */
export function apiError(
  message: string,
  status: number = 400,
  detail?: string
): NextResponse {
  const body: { error: string; detail?: string } = { error: message };
  if (detail !== undefined) body.detail = detail;
  return NextResponse.json(body, { status });
}

/**
 * Require admin session. Returns 401 response if not admin; otherwise returns null.
 * Usage: const authError = await requireAdmin(); if (authError) return authError;
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  if (!(await isAdminSession())) {
    return apiError("Unauthorized.", 401);
  }
  return null;
}
