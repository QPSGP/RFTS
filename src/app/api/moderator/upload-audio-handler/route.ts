import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireActiveModerator } from "@/lib/moderator-member-access";

const AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/webm",
  "audio/ogg"
];
const MAX_SIZE_BYTES = 100 * 1024 * 1024;

export async function POST(request: Request) {
  const moderator = await requireActiveModerator();
  if ("error" in moderator) {
    return NextResponse.json({ error: moderator.error }, { status: moderator.status });
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
    console.error("Moderator upload handler error:", message);
    const hint = !process.env.BLOB_READ_WRITE_TOKEN
      ? " Set BLOB_READ_WRITE_TOKEN in Vercel (Storage → your Blob store)."
      : "";
    return NextResponse.json({ error: message + hint }, { status: 400 });
  }
}
