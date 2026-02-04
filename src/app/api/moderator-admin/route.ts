import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { isAdminSession } from "@/lib/auth";
import {
  createModeratorAccount,
  createModeratorApplication,
  clearModeratorData,
  getModeratorByEmail,
  listModeratorApplications,
  listModerators,
  updateModeratorApplication,
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

const updateApplicationSchema = z.object({
  action: z.literal("update-application"),
  applicationId: z.string(),
  name: z.string().min(2),
  email: z.string().email(),
  focusAreas: z.string().min(3),
  experience: z.string().min(10),
  links: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  website: z.string().optional().default(""),
  socialLinks: z.string().optional().default(""),
  photoUrl: z.string().optional().default(""),
  profileSlug: z.string().optional().default("")
});

const resetDemoSchema = z.object({
  action: z.literal("reset-demo")
});

const seedDemoSchema = z.object({
  action: z.literal("seed-demo")
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
  if (body?.action === "reset-demo") {
    const parsed = resetDemoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }
    await clearModeratorData();
    return NextResponse.json({ ok: true });
  }
  if (body?.action === "seed-demo") {
    const parsed = seedDemoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }
    const application = await createModeratorApplication({
      name: "Demo Co-Creator",
      email: "demo.cocreator@rfts.test",
      focusAreas: "Sleep optimization, motivation, habit change",
      experience: "Demo application used to validate the approval flow.",
      links: "https://rfts.test",
      phone: "555-0100",
      website: "https://rfts.test",
      socialLinks: "https://facebook.com/rfts",
      photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
      profileSlug: "demo-co-creator"
    });
    return NextResponse.json({ ok: true, application });
  }
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
  if (body?.action === "update-application") {
    const parsed = updateApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }
    const updated = await updateModeratorApplication({
      id: parsed.data.applicationId,
      name: parsed.data.name,
      email: parsed.data.email,
      focusAreas: parsed.data.focusAreas,
      experience: parsed.data.experience,
      links: parsed.data.links,
      phone: parsed.data.phone,
      website: parsed.data.website,
      socialLinks: parsed.data.socialLinks,
      photoUrl: parsed.data.photoUrl,
      profileSlug: parsed.data.profileSlug
    });
    if (!updated) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }
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
