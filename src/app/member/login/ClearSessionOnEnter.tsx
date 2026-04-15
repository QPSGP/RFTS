"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * When you open the member login page, clear any existing member session so the
 * header does not show "Members Console" from a stale cookie. Then refresh so
 * the page and header re-render without the cookie.
 */
export default function ClearSessionOnEnter() {
  const router = useRouter();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    fetch("/api/user/logout", { method: "POST", credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.cleared) {
          router.refresh();
        }
      })
      .catch(() => {});
  }, [router]);

  return null;
}
