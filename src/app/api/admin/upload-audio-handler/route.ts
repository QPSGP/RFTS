import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";

const AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/webm",
  "audio/ogg"
];
const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB for large CGMR files

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json(
      { error: "Unauthorized. Log in as admin to upload." },
      { status: 401 }
    );
  }
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: AUDIO_TYPES,
        maximumSizeInBytes: MAX_SIZE_BYTES,
        addRandomSuffix: true
      })
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Upload handler error:", message);
    const hint = !process.env.BLOB_READ_WRITE_TOKEN
      ? " Set BLOB_READ_WRITE_TOKEN in Vercel (Storage → your Blob store)."
      : "";
    return NextResponse.json(
      { error: message + hint },
      { status: 400 }
    );
  }
}
