import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import {
  createModeratorApplication,
  listModeratorApplications
} from "@/lib/db";

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  focusAreas: z.string().min(3),
  experience: z.string().min(10),
  links: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  website: z.string().optional().default(""),
  socialLinks: z.string().optional().default(""),
  photoUrl: z.string().optional().default("")
});

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({ applications: await listModeratorApplications() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body. Please check your entries." },
      { status: 400 }
    );
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues || [];
    const messages = issues.map((i) => {
      const path = i.path?.join(".") || "field";
      return `${path}: ${i.message}`;
    });
    const msg =
      messages.length > 0
        ? messages.join(". ")
        : "Please check: name (2+ chars), email (valid), focus areas (3+ chars), experience (10+ chars).";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  try {
    const applications = await listModeratorApplications();
    const existing = applications.find(
      (a) => a.email.toLowerCase() === parsed.data.email.toLowerCase()
    );
    if (existing?.status === "approved") {
      return NextResponse.json(
        { error: "An application with this email has already been approved." },
        { status: 409 }
      );
    }
    await createModeratorApplication({
      name: parsed.data.name,
      email: parsed.data.email,
      focusAreas: parsed.data.focusAreas,
      experience: parsed.data.experience,
      links: parsed.data.links || "",
      phone: parsed.data.phone || "",
      website: parsed.data.website || "",
      socialLinks: parsed.data.socialLinks || "",
      photoUrl: parsed.data.photoUrl || "",
      profileSlug: toSlug(parsed.data.name)
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Facilitator application error:", err);
    return NextResponse.json(
      { error: "Unable to save application. Please try again." },
      { status: 500 }
    );
  }
}
