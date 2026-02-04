import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import { createModeratorApplication, listModeratorApplications } from "@/lib/db";

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
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
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
}
