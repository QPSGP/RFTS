import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import {
  getLastLoginByStaffEmail,
  getStaffActivityLog,
  listAdmins,
  listModerators
} from "@/lib/db";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const [admins, moderators, lastLogins, activityLog] = await Promise.all([
    listAdmins(),
    listModerators(),
    getLastLoginByStaffEmail(),
    getStaffActivityLog(100)
  ]);
  const adminsWithLastLogin = admins.map((a) => ({
    id: a.id,
    email: a.email,
    status: a.status,
    createdAt: a.createdAt,
    lastLoginAt: lastLogins.get(a.email.toLowerCase()) ?? null
  }));
  const moderatorsWithLastLogin = moderators.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    status: m.status,
    createdAt: m.createdAt,
    lastLoginAt: lastLogins.get(m.email.toLowerCase()) ?? null
  }));
  return NextResponse.json({
    admins: adminsWithLastLogin,
    moderators: moderatorsWithLastLogin,
    activityLog
  });
}
