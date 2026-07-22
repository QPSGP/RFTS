import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireActiveModerator } from "@/lib/moderator-member-access";
import { getWelcomeEmailCcRecipients, sendEmail, getBaseUrl } from "@/lib/email";
import { getFacilitatorCreatedMemberEmailContent } from "@/lib/email-templates";
import { recordModeratorStaffActivity } from "@/lib/facilitator-staff-activity";
import {
  createUser,
  ensureSubscription,
  getMemberSummariesByEmails,
  getUserByEmail,
  listUsersByEmails,
  setUserPlaysPerNight,
  updateModeratorAccount,
  upsertMemberProfile
} from "@/lib/db";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  tier: z.enum(["platinum", "platinum_managed"]).default("platinum"),
  status: z.enum(["inactive", "active", "past_due", "canceled"]).default("inactive"),
  playsPerNight: z.number().int().min(1).max(2).optional()
});

export async function GET() {
  const moderator = await requireActiveModerator();
  if ("error" in moderator) {
    return NextResponse.json({ error: moderator.error }, { status: moderator.status });
  }
  const assignedEmails = moderator.assignedUserEmails;
  const summaries = await getMemberSummariesByEmails(assignedEmails);
  const registered = await listUsersByEmails(assignedEmails);
  const byEmail = new Map(registered.map((row) => [row.email.toLowerCase(), row]));

  const members = summaries.map((summary) => {
    const row = byEmail.get(summary.email.toLowerCase());
    if (!row) {
      return {
        email: summary.email,
        registered: false,
        firstName: summary.firstName,
        lastName: summary.lastName,
        subscriptionTier: summary.subscriptionTier,
        subscriptionStatus: summary.subscriptionStatus,
        goalIds: [],
        playsPerNight: 2
      };
    }
    return {
      email: row.email,
      registered: true,
      firstName: row.firstName,
      lastName: row.lastName,
      subscriptionTier: row.subscriptionTier,
      subscriptionStatus: row.subscriptionStatus,
      goalIds: row.goalIds ?? [],
      playsPerNight: row.playsPerNight ?? 2
    };
  });

  return NextResponse.json({ members });
}

export async function POST(request: Request) {
  const moderator = await requireActiveModerator();
  if ("error" in moderator) {
    return NextResponse.json({ error: moderator.error }, { status: moderator.status });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const email = parsed.data.email.trim();
  const emailLower = email.toLowerCase();
  const assignedLower = moderator.assignedUserEmails.map((e) => e.trim().toLowerCase());

  if (assignedLower.includes(emailLower)) {
    return NextResponse.json({ error: "This member is already on your client list." }, { status: 409 });
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    await updateModeratorAccount({
      moderatorId: moderator.id,
      assignedUserEmails: [...moderator.assignedUserEmails, email]
    });
    await recordModeratorStaffActivity(`assigned_existing_member:${emailLower}`);
    return NextResponse.json({
      ok: true,
      assignedExisting: true,
      message: "Existing member added to your client list."
    });
  }

  if (!parsed.data.password || parsed.data.password.length < 6) {
    return NextResponse.json(
      { error: "Password is required (6+ characters) for new members." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await createUser(email, passwordHash);
  await ensureSubscription(user.id, parsed.data.tier, parsed.data.status);
  if (parsed.data.playsPerNight) {
    await setUserPlaysPerNight(user.id, parsed.data.playsPerNight);
  }
  await upsertMemberProfile({
    userId: user.id,
    firstName: parsed.data.firstName?.trim() || null,
    lastName: parsed.data.lastName?.trim() || null
  });
  await updateModeratorAccount({
    moderatorId: moderator.id,
    assignedUserEmails: [...moderator.assignedUserEmails, email]
  });

  const tierLabel =
    parsed.data.tier === "platinum_managed" ? "Platinum Managed Member" : "Gold Member";
  const statusLabel =
    parsed.data.status === "active" ? "Active" : "Inactive (billing not started)";
  const billingNote =
    parsed.data.status === "active"
      ? "Your membership is active — you can sign in and use the member console."
      : "Your account is inactive until billing is set up. Your facilitator or our team will help you activate membership.";

  const loginUrl = `${getBaseUrl()}/member/login`;
  const welcome = getFacilitatorCreatedMemberEmailContent({
    firstName: parsed.data.firstName,
    tierLabel,
    statusLabel,
    facilitatorName: moderator.name,
    loginUrl,
    billingNote
  });
  const emailResult = await sendEmail({
    to: email,
    subject: welcome.subject,
    html: welcome.html,
    text: welcome.text,
    cc: getWelcomeEmailCcRecipients({
      memberEmail: email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName
    })
  });
  if (!emailResult.ok) {
    console.error("[moderator/members POST] Welcome email failed:", emailResult.error);
  }

  await recordModeratorStaffActivity(
    `created_member:${email.toLowerCase()}:${parsed.data.tier}`
  );

  return NextResponse.json({
    ok: true,
    assignedExisting: false,
    message: emailResult.ok
      ? "Member created, assigned to you, and welcome email sent."
      : "Member created and assigned. Welcome email could not be sent — share login details manually."
  });
}
