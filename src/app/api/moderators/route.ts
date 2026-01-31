import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import { createModeratorApplication, listModeratorApplications } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  focusAreas: z.string().min(3),
  experience: z.string().min(10),
  links: z.string().optional().default("")
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
    links: parsed.data.links || ""
  });
  return NextResponse.json({ ok: true });
}
