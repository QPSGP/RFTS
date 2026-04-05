"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const LOGGED_PREFIXES = [
  "/play-options",
  "/goals",
  "/library",
  "/member/profile",
  "/member/report-issue"
];

function shouldLogPathname(pathname: string): boolean {
  return LOGGED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Records member page views for admin activity (same-origin paths only).
 * Ignores unauthenticated requests (API returns 401).
 */
export default function MemberRouteActivityLogger() {
  const pathname = usePathname();
  const lastSentRef = useRef<{ key: string; at: number } | null>(null);

  useEffect(() => {
    if (!pathname || !shouldLogPathname(pathname)) return;
    const search = typeof window !== "undefined" ? window.location.search || "" : "";
    const full = `${pathname}${search}`.slice(0, 500);
    const now = Date.now();
    const prev = lastSentRef.current;
    if (prev && prev.key === full && now - prev.at < 2500) return;
    lastSentRef.current = { key: full, at: now };

    fetch("/api/user/activity", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "page_view", details: full })
    }).catch(() => {});
  }, [pathname]);

  return null;
}
