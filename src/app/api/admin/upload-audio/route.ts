import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";

const MAX_SIZE_MB = 4;
const ALLOWED_TYPES = ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/webm", "audio/ogg"];

function sanitizePathSegment(name: string): string {
  return name
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200) || "audio";
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }
  const file = formData.get("file") ?? formData.get("audio");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file. Use form field 'file' or 'audio'." }, { status: 400 });
  }
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_SIZE_MB) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_SIZE_MB} MB).` },
      { status: 400 }
    );
  }
  const contentType = file.type || "audio/mpeg";
  const isAllowed =
    /\.(mp3|m4a|wav|webm|ogg)$/i.test(file.name) ||
    ALLOWED_TYPES.includes(contentType) ||
    contentType.startsWith("audio/");
  if (!isAllowed) {
    return NextResponse.json(
      { error: "Invalid file type. Use MP3, M4A, WAV, WebM, or OGG." },
      { status: 400 }
    );
  }
  const baseName = sanitizePathSegment(file.name.replace(/\.[^.]+$/, "") || "audio");
  const ext = file.name.match(/\.[^.]+$/)?.[0] || ".mp3";
  const pathname = `audios/${baseName}${ext}`;
  try {
    const blob = await put(pathname, file, {
      access: "public",
      contentType: contentType.startsWith("audio/") ? contentType : "audio/mpeg",
      addRandomSuffix: true
    });
    return NextResponse.json({ url: blob.url, fileName: file.name });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("Upload error:", err);
    let message = "Upload failed.";
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      message = "Blob not configured. Set BLOB_READ_WRITE_TOKEN in Vercel → Storage.";
    } else if (err.message?.includes("size") || err.message?.includes("body")) {
      message = "File too large or request failed. Max 4 MB.";
    } else if (err.message) {
      message = `Upload failed: ${err.message}`;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
