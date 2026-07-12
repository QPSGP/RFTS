"use client";

import { useEffect, useState } from "react";

/** Client-side member session check (for client pages/components). */
export function useMemberLoggedIn(): boolean | null {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user/me", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setLoggedIn(false);
          return;
        }
        const data = (await res.json()) as { isAdmin?: boolean; profile?: { email?: string } };
        setLoggedIn(!data.isAdmin && Boolean(data.profile?.email));
      })
      .catch(() => {
        if (!cancelled) setLoggedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return loggedIn;
}
