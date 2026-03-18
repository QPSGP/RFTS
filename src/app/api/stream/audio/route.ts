/**
 * Stream audio by id or prep=1. Access for members:
 * - Managed (platinum_managed): allowedEmailsMatch (track's allowedUserEmails contains member email).
 * - Gold (platinum): allowedEmailsMatch OR goalMatch (item.interestIds ∩ profile.goalIds) OR isCgmrFallback (category cgmr).
 * Response headers: X-Stream-Access-Reason (allowedEmailsMatch | goalMatch | isCgmrFallback), X-Stream-Tier, or on deny X-Stream-Deny-Reason.
 */
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { isAdminSession } from "@/lib/auth";
import { getUserSessionEmail } from "@/lib/user-auth";
import {
  getLibraryItem,
  getMemberProfileByUserId,
  getPlaybackSettings,
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
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401, headers: { "X-Stream-Deny-Reason": "no-session" } }
    );
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
  const streamDebugHeaders: Record<string, string> = {};

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
      const reason = !item ? "item-not-found" : "item-has-no-audio-url";
      return NextResponse.json(
        { error: "Not found.", debug: reason },
        { status: 404, headers: { "X-Stream-Deny-Reason": reason } }
      );
    }
    if (isAdmin) {
      audioUrl = item.audioUrl;
    } else {
    if (!profile || !email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
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
    const allowedEmailsMatch =
      !item.allowedUserEmails ||
      item.allowedUserEmails.length === 0 ||
      item.allowedUserEmails.some(
        (e) => e.trim().toLowerCase() === email.trim().toLowerCase()
      );
    const profileGoalIds = (profile.goalIds || []).map((id) => String(id).trim().toLowerCase());
    const itemInterestIds = (item.interestIds || []).map((id) => String(id).trim().toLowerCase());
    const goalMatch =
      profileGoalIds.length > 0 &&
      itemInterestIds.length > 0 &&
      itemInterestIds.some((gid) => profileGoalIds.includes(gid));
    const isCgmrFallback = (item.categories || []).some(
      (c) => c.toLowerCase() === "cgmr"
    );
    const settings = await getPlaybackSettings();
    const fallbackCode = (settings.fallbackTrackId || "T-18").trim().toUpperCase();
    const isAppFallbackTrack =
      !!fallbackCode &&
      ((item.skuCode || "").toUpperCase().includes(fallbackCode) ||
        (item.title || "").toUpperCase().includes(fallbackCode));
    const tier = profile.subscriptionTier ?? "";

    if (!allowedEmailsMatch && !goalMatch && !isCgmrFallback && !isAppFallbackTrack) {
      const denyReason = `allowedEmailsMatch=${allowedEmailsMatch} goalMatch=${goalMatch} isCgmrFallback=${isCgmrFallback} isAppFallbackTrack=${isAppFallbackTrack} tier=${tier}`;
      return NextResponse.json(
        { error: "Access denied.", debug: denyReason },
        {
          status: 403,
          headers: { "X-Stream-Deny-Reason": denyReason },
        }
      );
    }
    const accessReason = allowedEmailsMatch
      ? "allowedEmailsMatch"
      : goalMatch
        ? "goalMatch"
        : isAppFallbackTrack
          ? "isAppFallbackTrack"
          : "isCgmrFallback";
    audioUrl = item.audioUrl;
    if (audioUrl) {
      streamDebugHeaders["X-Stream-Access-Reason"] = accessReason;
      streamDebugHeaders["X-Stream-Tier"] = tier;
    }
    }
  }

  if (!audioUrl) {
    return NextResponse.json(
      { error: "Not found.", debug: "no-audio-url-or-missing-item" },
      {
        status: 404,
        headers: { "X-Stream-Deny-Reason": "no-audio-url" },
      }
    );
  }

  const range = request.headers.get("range");
  const headers: Record<string, string> = {
    "Content-Type": getContentType(audioUrl),
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    ...streamDebugHeaders,
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
      headers,
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
    headers: { ...headers, "Content-Type": contentType },
  });
}
