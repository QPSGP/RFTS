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

/** Slugify for fallback filename: safe chars + .mp3 */
function fallbackFileName(item: { title?: string; skuCode?: string; id: string }): string {
  const raw = (item.skuCode || item.title || item.id || "audio").toString().trim();
  const slug = raw
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "audio";
  return slug ? `${slug}.mp3` : "audio.mp3";
}

/** One-time: set each library item's file_name from audio_url (or fallback to title/sku). */
export async function POST() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const library = await listLibrary();
  let updated = 0;
  for (const item of library) {
    let fileName = item.audioUrl ? getFileNameFromAudioUrl(item.audioUrl) : "";
    const looksLikeRealFile = fileName && /[.]/.test(fileName) && !/^[a-z0-9-]+\.(com|net|org|io)$/i.test(fileName);
    if (!fileName || fileName === "audio" || !looksLikeRealFile) {
      fileName = fallbackFileName(item);
    }
    await updateLibraryItem({
      id: item.id,
      title: item.title,
      description: item.description,
      skuCode: item.skuCode ?? "",
      fileName,
      categories: item.categories ?? [],
      coverUrl: item.coverUrl,
      audioUrl: item.audioUrl ?? "",
      interestIds: item.interestIds ?? [],
      allowedUserEmails: item.allowedUserEmails ?? [],
      order: item.order,
      isAdult: item.isAdult
    });
    updated += 1;
  }
  return NextResponse.json({ updated, total: library.length });
}
