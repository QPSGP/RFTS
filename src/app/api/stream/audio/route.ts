import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { isAdminSession } from "@/lib/auth";
import { getUserSessionEmail } from "@/lib/user-auth";
import {
  getLibraryItem,
  getMemberProfileByUserId,
  getUserProfile
} from "@/lib/db";

const dataDir = path.join(process.cwd(), "data");
const PREP_AUDIO_NAME = "RFTS_starting_music.mp3";

const readJson = <T>(fileName: string, fallback: T): T => {
  const filePath = path.join(dataDir, fileName);
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  return raw ? (JSON.parse(raw) as T) : fallback;
};

const getContentType = (url: string) => {
  const lower = url.toLowerCase();
  if (lower.includes(".mp3") || lower.endsWith("mp3")) return "audio/mpeg";
  if (lower.includes(".m4a") || lower.endsWith("m4a")) return "audio/mp4";
  if (lower.includes(".wav") || lower.endsWith("wav")) return "audio/wav";
  return "audio/mpeg";
};

export async function GET(request: Request) {
  const isAdmin = await isAdminSession();
  const email = await getUserSessionEmail();
  if (!isAdmin && !email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let profile: Awaited<ReturnType<typeof getUserProfile>> | null = null;
  if (email) {
    profile = await getUserProfile(email);
    if (!profile) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    if (profile.subscriptionStatus !== "active") {
      return NextResponse.json({ error: "Subscription required." }, { status: 403 });
    }
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const prep = searchParams.get("prep") === "1";

  let audioUrl: string | null = null;

  if (prep) {
    const blobAssets = readJson<{ audios?: Record<string, string> }>(
      "blob-assets.json",
      {}
    );
    audioUrl = blobAssets.audios?.[PREP_AUDIO_NAME] || null;
  } else if (id) {
    const item = await getLibraryItem(id);
    if (!item || !item.audioUrl) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    const isCgmr =
      (item.categories || []).some((c) => c.toLowerCase() === "cgmr") ?? false;
    if (isCgmr) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }
    if (isAdmin) {
      audioUrl = item.audioUrl;
    } else {
    const isSpecial =
      (item.categories || []).some((c) => c.toLowerCase() === "special") ?? false;
    if (isSpecial) {
      const memberProfile = await getMemberProfileByUserId(profile.id);
      const wantsPracticeGrowth = memberProfile?.wantsPracticeGrowth ?? false;
      if (!wantsPracticeGrowth) {
        return NextResponse.json({ error: "Access denied. Special category is for therapists, healers, and coaches." }, { status: 403 });
      }
    }
    if (item.isAdult) {
      const memberProfile = await getMemberProfileByUserId(profile.id);
      const yearBornRaw = memberProfile?.yearBorn ?? null;
      const yearBorn =
        yearBornRaw != null
          ? typeof yearBornRaw === "number"
            ? yearBornRaw
            : parseInt(String(yearBornRaw), 10)
          : null;
      const yearBornNum =
        yearBorn != null && !Number.isNaN(yearBorn) && yearBorn >= 1900 && yearBorn <= 2100
          ? yearBorn
          : null;
      const hasVerifiedAge =
        yearBornNum != null && new Date().getFullYear() - yearBornNum >= 18;
      const storedConsent = memberProfile?.adultConsent ?? false;
      const canAccess = storedConsent && hasVerifiedAge;
      if (!canAccess) {
        return NextResponse.json({ error: "Adult content requires birthdate and 18+ age verification." }, { status: 403 });
      }
    }
    if (
      item.allowedUserEmails &&
      item.allowedUserEmails.length > 0 &&
      !item.allowedUserEmails.some(
        (e) => e.trim().toLowerCase() === email.trim().toLowerCase()
      )
    ) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }
    audioUrl = item.audioUrl;
    }
  }

  if (!audioUrl) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const range = request.headers.get("range");
  const headers: Record<string, string> = {
    "Content-Type": getContentType(audioUrl),
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff"
  };

  if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://")) {
    const fetchHeaders: Record<string, string> = {};
    if (range) fetchHeaders["Range"] = range;
    const upstream = await fetch(audioUrl, { headers: fetchHeaders });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Upstream unavailable." },
        { status: 502 }
      );
    }
    const contentType = upstream.headers.get("content-type");
    if (contentType) headers["Content-Type"] = contentType;
    const contentRange = upstream.headers.get("content-range");
    if (contentRange) headers["Content-Range"] = contentRange;
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers["Content-Length"] = contentLength;
    const acceptRanges = upstream.headers.get("accept-ranges");
    if (acceptRanges) headers["Accept-Ranges"] = acceptRanges;
    const status = upstream.status;
    const body = upstream.body;
    if (!body) {
      return NextResponse.json({ error: "No body." }, { status: 502 });
    }
    return new NextResponse(body as unknown as ReadableStream<Uint8Array>, {
      status,
      headers
    });
  }

  const audiosDir = path.join(process.cwd(), "Audios");
  const fileName = path.basename(audioUrl.split("?")[0]) || audioUrl;
  const resolvedPath = path.join(audiosDir, path.basename(fileName));
  if (!fs.existsSync(resolvedPath)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const stat = fs.statSync(resolvedPath);
  const contentType = getContentType(resolvedPath);

  if (!range) {
    const buffer = fs.readFileSync(resolvedPath);
    headers["Content-Length"] = stat.size.toString();
    return new NextResponse(buffer, { status: 200, headers });
  }

  const bytesPrefix = "bytes=";
  if (!range.startsWith(bytesPrefix)) {
    return NextResponse.json({ error: "Invalid range." }, { status: 416 });
  }
  const rangeParts = range.replace(bytesPrefix, "").split("-");
  const start = parseInt(rangeParts[0] || "0", 10);
  const end = rangeParts[1] ? parseInt(rangeParts[1], 10) : stat.size - 1;
  if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
    return NextResponse.json({ error: "Invalid range." }, { status: 416 });
  }
  const chunkSize = end - start + 1;
  const stream = fs.createReadStream(resolvedPath, { start, end });
  headers["Content-Range"] = `bytes ${start}-${end}/${stat.size}`;
  headers["Content-Length"] = chunkSize.toString();
  headers["Accept-Ranges"] = "bytes";

  return new NextResponse(stream as unknown as BodyInit, {
    status: 206,
    headers: { ...headers, "Content-Type": contentType }
  });
}
