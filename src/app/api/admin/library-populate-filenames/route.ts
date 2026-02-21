import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { listLibrary, updateLibraryItem } from "@/lib/db";

function getFileNameFromAudioUrl(url: string): string {
  if (!url || typeof url !== "string") return "";
  try {
    const withoutQuery = url.split("?")[0];
    const segment = withoutQuery.split("/").filter(Boolean).pop();
    return segment || "";
  } catch {
    return "";
  }
}

/** One-time: set each library item's file_name from its audio_url (last path segment). */
export async function POST() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const library = await listLibrary();
  let updated = 0;
  for (const item of library) {
    if (!item.audioUrl) continue;
    const fileName = getFileNameFromAudioUrl(item.audioUrl);
    if (!fileName) continue;
    await updateLibraryItem({
      id: item.id,
      title: item.title,
      description: item.description,
      skuCode: item.skuCode ?? "",
      fileName,
      categories: item.categories ?? [],
      coverUrl: item.coverUrl,
      audioUrl: item.audioUrl,
      interestIds: item.interestIds ?? [],
      allowedUserEmails: item.allowedUserEmails ?? [],
      order: item.order,
      isAdult: item.isAdult
    });
    updated += 1;
  }
  return NextResponse.json({ updated, total: library.length });
}
