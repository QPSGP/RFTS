import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { isAdminSession } from "@/lib/auth";
import {
  createModeratorAccount,
  getModeratorByEmail,
  listModeratorApplications,
  listModerators,
  updateModeratorAccount,
  updateModeratorApplicationStatus
} from "@/lib/db";

const approveSchema = z.object({
  applicationId: z.string(),
  accessCode: z.string().min(6),
  assignedUserEmails: z.array(z.string().email()).optional().default([])
});

const declineSchema = z.object({
  applicationId: z.string()
});

const updateSchema = z.object({
  moderatorId: z.string(),
  assignedUserEmails: z.array(z.string().email()).optional(),
  status: z.enum(["active", "paused"]).optional(),
  resetAccessCode: z.string().min(6).optional()
});

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({
    applications: await listModeratorApplications(),
    moderators: await listModerators()
  });
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  if (body?.action === "decline") {
    const parsed = declineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }
    const updated = await updateModeratorApplicationStatus(
      parsed.data.applicationId,
      "declined"
    );
    if (!updated) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const applications = await listModeratorApplications();
  const application = applications.find((item) => item.id === parsed.data.applicationId);
  if (!application) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.accessCode, 10);
  await updateModeratorApplicationStatus(parsed.data.applicationId, "approved");
  const existing = await getModeratorByEmail(application.email);
  if (!existing) {
    await createModeratorAccount({
      name: application.name,
      email: application.email,
      passwordHash,
      assignedUserEmails: parsed.data.assignedUserEmails
    });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const updated = await updateModeratorAccount({
    moderatorId: parsed.data.moderatorId,
    assignedUserEmails: parsed.data.assignedUserEmails,
    status: parsed.data.status,
    passwordHash: parsed.data.resetAccessCode
      ? await bcrypt.hash(parsed.data.resetAccessCode, 10)
      : undefined
  });
  if (!updated) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
