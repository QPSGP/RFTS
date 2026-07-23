import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import { listEmailStaffLists, saveAllEmailStaffLists } from "@/lib/db";
import {
  EMAIL_STAFF_LIST_KEYS,
  EMAIL_STAFF_LIST_META,
  isEmailStaffListKey,
  normalizeEmailList
} from "@/lib/email-staff-lists";

const emailSchema = z.string().email();

const putSchema = z.object({
  lists: z.record(z.string(), z.array(z.string()))
});

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const lists = await listEmailStaffLists();
  return NextResponse.json({
    lists,
    meta: EMAIL_STAFF_LIST_META
  });
}

export async function PUT(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const next: Partial<Record<(typeof EMAIL_STAFF_LIST_KEYS)[number], string[]>> = {};
  for (const [key, emails] of Object.entries(parsed.data.lists)) {
    if (!isEmailStaffListKey(key)) {
      return NextResponse.json({ error: `Unknown list: ${key}` }, { status: 400 });
    }
    const normalized = normalizeEmailList(emails);
    for (const addr of normalized) {
      const ok = emailSchema.safeParse(addr);
      if (!ok.success) {
        return NextResponse.json({ error: `Invalid email: ${addr}` }, { status: 400 });
      }
    }
    next[key] = normalized;
  }

  const lists = await saveAllEmailStaffLists(next);
  return NextResponse.json({ ok: true, lists });
}
