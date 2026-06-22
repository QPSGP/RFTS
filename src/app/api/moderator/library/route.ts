import { NextResponse } from "next/server";
import { requireActiveModerator } from "@/lib/moderator-member-access";
import { listLibrary } from "@/lib/db";

export async function GET() {
  const moderator = await requireActiveModerator();
  if ("error" in moderator) {
    return NextResponse.json({ error: moderator.error }, { status: moderator.status });
  }
  const library = await listLibrary();
  return NextResponse.json({
    library: library.map((item) => ({
      id: item.id,
      title: item.title,
      skuCode: item.skuCode ?? "",
      description: item.description ?? ""
    }))
  });
}
