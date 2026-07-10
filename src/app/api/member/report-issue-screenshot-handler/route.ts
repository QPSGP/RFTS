import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import {
  REPORT_ISSUE_ATTACHMENT_TYPES,
  REPORT_ISSUE_MAX_ATTACHMENT_BYTES,
  REPORT_ISSUE_UPLOAD_PATH_PREFIX
} from "@/lib/report-issue-attachments";
import { getUserSessionEmail } from "@/lib/user-auth";

const LEGACY_UPLOAD_PATH_PREFIX = "issue-screenshots/";

export async function POST(request: Request) {
  const memberEmail = await getUserSessionEmail();
  const adminOk = await isAdminSession();
  if (!memberEmail && !adminOk) {
    return NextResponse.json({ error: "You must be logged in to upload an attachment." }, { status: 401 });
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
      onBeforeGenerateToken: async (pathname) => {
        if (
          !pathname.startsWith(REPORT_ISSUE_UPLOAD_PATH_PREFIX) &&
          !pathname.startsWith(LEGACY_UPLOAD_PATH_PREFIX)
        ) {
          throw new Error("Invalid upload path.");
        }
        return {
          allowedContentTypes: [...REPORT_ISSUE_ATTACHMENT_TYPES],
          maximumSizeInBytes: REPORT_ISSUE_MAX_ATTACHMENT_BYTES,
          addRandomSuffix: true
        };
      }
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[report-issue-screenshot-handler]", message);
    const hint = !process.env.BLOB_READ_WRITE_TOKEN
      ? " Attachment upload is not configured on the server."
      : "";
    return NextResponse.json({ error: message + hint }, { status: 400 });
  }
}
