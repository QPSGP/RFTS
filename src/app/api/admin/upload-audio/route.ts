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
    console.error("Upload error:", e);
    return NextResponse.json(
      { error: process.env.BLOB_READ_WRITE_TOKEN ? "Upload failed." : "BLOB_READ_WRITE_TOKEN not set." },
      { status: 500 }
    );
  }
}
