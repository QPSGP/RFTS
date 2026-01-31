import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import {
  getModeratorApplications,
  saveModeratorApplications
} from "@/lib/storage";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  focusAreas: z.string().min(3),
  experience: z.string().min(10),
  links: z.string().optional().default("")
});

export async function GET() {
  if (!isAdminSession()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({ applications: getModeratorApplications() });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const applications = getModeratorApplications();
  const record = {
    id: crypto.randomUUID(),
    name: parsed.data.name,
    email: parsed.data.email,
    focusAreas: parsed.data.focusAreas,
    experience: parsed.data.experience,
    links: parsed.data.links || "",
    submittedAt: new Date().toISOString(),
    status: "pending" as const
  };
  applications.push(record);
  saveModeratorApplications(applications);
  return NextResponse.json({ ok: true });
}
