import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { isAdminSession } from "@/lib/auth";
import {
  getModeratorApplications,
  getModerators,
  saveModeratorApplications,
  saveModerators
} from "@/lib/storage";

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
  if (!isAdminSession()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({
    applications: getModeratorApplications(),
    moderators: getModerators()
  });
}

export async function POST(request: Request) {
  if (!isAdminSession()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  if (body?.action === "decline") {
    const parsed = declineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }
    const applications = getModeratorApplications();
    const index = applications.findIndex((item) => item.id === parsed.data.applicationId);
    if (index === -1) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    applications[index] = { ...applications[index], status: "declined" };
    saveModeratorApplications(applications);
    return NextResponse.json({ ok: true });
  }

  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const applications = getModeratorApplications();
  const index = applications.findIndex((item) => item.id === parsed.data.applicationId);
  if (index === -1) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const application = applications[index];
  const moderators = getModerators();

  const passwordHash = await bcrypt.hash(parsed.data.accessCode, 10);
  moderators.push({
    id: crypto.randomUUID(),
    name: application.name,
    email: application.email,
    passwordHash,
    assignedUserEmails: parsed.data.assignedUserEmails,
    status: "active",
    createdAt: new Date().toISOString()
  });

  applications[index] = { ...application, status: "approved" };
  saveModeratorApplications(applications);
  saveModerators(moderators);

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  if (!isAdminSession()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const moderators = getModerators();
  const index = moderators.findIndex((item) => item.id === parsed.data.moderatorId);
  if (index === -1) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const update: typeof moderators[number] = { ...moderators[index] };
  if (parsed.data.assignedUserEmails) {
    update.assignedUserEmails = parsed.data.assignedUserEmails;
  }
  if (parsed.data.status) {
    update.status = parsed.data.status;
  }
  if (parsed.data.resetAccessCode) {
    update.passwordHash = await bcrypt.hash(parsed.data.resetAccessCode, 10);
  }
  moderators[index] = update;
  saveModerators(moderators);
  return NextResponse.json({ ok: true });
}
