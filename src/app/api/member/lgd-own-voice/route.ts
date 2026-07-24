import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getUserSessionEmail } from "@/lib/user-auth";
import {
  getLatestLgdIntakeForUser,
  getUserProfile,
  setLgdIntakeOwnVoiceAudioUrl
} from "@/lib/db";
import { isLgdAdminOnlyMode } from "@/lib/lgd-access";
import { isAdminSession } from "@/lib/auth";
import { normalizeLgdIntakeAnswers } from "@/lib/lgd-intake";

export async function POST(request: Request) {
  if (isLgdAdminOnlyMode() && !(await isAdminSession())) {
    return NextResponse.json(
      { error: "Own-voice upload is in admin preview only for now." },
      { status: 403 }
    );
  }
  const email = await getUserSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const user = await getUserProfile(email);
  if (!user) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const intake = await getLatestLgdIntakeForUser(user.id);
  if (!intake) {
    return NextResponse.json({ error: "No LGD intake found." }, { status: 404 });
  }
  const answers = normalizeLgdIntakeAnswers(intake.answers);
  if (!answers.ownVoiceConsent || answers.voiceId !== "member_own") {
    return NextResponse.json(
      {
        error:
          "Confirm “My own voice” and the voice recording agreement consent on your intake first."
      },
      { status: 400 }
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing audio file." }, { status: 400 });
  }
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "Recording must be under 25 MB." }, { status: 400 });
  }

  const ext =
    file.type.includes("mp4") || file.name.endsWith(".mp4")
      ? "mp4"
      : file.type.includes("mpeg") || file.name.endsWith(".mp3")
        ? "mp3"
        : "webm";
  const pathname = `lgd-own-voice/${user.id}/${intake.id}-${Date.now()}.${ext}`;
  const blob = await put(pathname, file, {
    access: "public",
    contentType: file.type || `audio/${ext}`
  });
  const ok = await setLgdIntakeOwnVoiceAudioUrl(intake.id, user.id, blob.url);
  if (!ok) {
    return NextResponse.json({ error: "Could not save recording URL." }, { status: 500 });
  }
  return NextResponse.json({ url: blob.url });
}
