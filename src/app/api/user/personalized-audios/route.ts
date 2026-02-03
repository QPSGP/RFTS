import { NextResponse } from "next/server";
import { getUserSessionEmail } from "@/lib/user-auth";
import { listPersonalizedLibraryForUser } from "@/lib/db";

const isCgmr = (categories?: string[]) =>
  (categories || []).some((category) => category.toLowerCase() === "cgmr");

export async function GET() {
  const email = getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const items = await listPersonalizedLibraryForUser(email);
  const personalized = items.filter((item) => isCgmr(item.categories));
  return NextResponse.json({
    items: personalized.map((item) => ({ id: item.id, title: item.title }))
  });
}
