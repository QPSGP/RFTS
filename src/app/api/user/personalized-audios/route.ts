import { NextResponse } from "next/server";
import { getUserSessionEmail } from "@/lib/user-auth";
import { listPersonalizedLibraryForUser } from "@/lib/db";
import { pickNewestMemberCgmr } from "@/lib/library-access";

export async function GET() {
  const email = await getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const items = await listPersonalizedLibraryForUser(email);
  const newest = pickNewestMemberCgmr(items, email);
  const personalized = newest ? [newest] : [];
  return NextResponse.json({
    items: personalized.map((item) => ({
      id: item.id,
      title: item.title,
      audioUrl: item.audioUrl || "",
      description: item.description || ""
    }))
  });
}
