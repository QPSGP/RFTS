import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";

const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];

function sanitizePathSegment(name: string): string {
  return name
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200) || "cover";
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

  const file = formData.get("file") ?? formData.get("cover");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file. Use form field 'file' or 'cover'." }, { status: 400 });
  }

  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_SIZE_MB) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_SIZE_MB} MB).` },
      { status: 400 }
    );
  }

  const contentType = file.type || "image/png";
  const isAllowed =
    /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name) ||
    ALLOWED_TYPES.includes(contentType) ||
    contentType.startsWith("image/");
  if (!isAllowed) {
    return NextResponse.json(
      { error: "Invalid image type. Use PNG, JPG, WEBP, GIF, or SVG." },
      { status: 400 }
    );
  }

  const baseName = sanitizePathSegment(file.name.replace(/\.[^.]+$/, "") || "cover");
  const ext = file.name.match(/\.[^.]+$/)?.[0] || ".png";
  const pathname = `covers/${baseName}${ext}`;

  try {
    const blob = await put(pathname, file, {
      access: "public",
      contentType: contentType.startsWith("image/") ? contentType : "image/png",
      addRandomSuffix: true
    });
    return NextResponse.json({ url: blob.url, fileName: file.name });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("Cover upload error:", err);
    let message = "Upload failed.";
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      message = "Blob not configured. Set BLOB_READ_WRITE_TOKEN in Vercel → Storage.";
    } else if (err.message) {
      message = `Upload failed: ${err.message}`;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
