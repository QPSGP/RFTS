import { NextResponse } from "next/server";
import { listInterests } from "@/lib/db";
import { requireActiveModerator } from "@/lib/moderator-member-access";

export async function GET() {
  const moderator = await requireActiveModerator();
  if ("error" in moderator) {
    return NextResponse.json({ error: moderator.error }, { status: moderator.status });
  }
  const interests = await listInterests();
  return NextResponse.json({
    interests: interests.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description ?? "",
      isAdult: item.isAdult ?? false,
      categories: item.categories ?? []
    }))
  });
}
