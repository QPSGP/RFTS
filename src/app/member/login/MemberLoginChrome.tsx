"use client";

import { useEffect, useState } from "react";

/**
 * Adds body.member-login for CSS tweaks, and a clear way to drop a stale member cookie
 * when the header still shows "Members Console" but the user needs another account.
 */
export default function MemberLoginChrome({ children }: { children: React.ReactNode }) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.body.classList.add("member-login");
    return () => document.body.classList.remove("member-login");
  }, []);

  const signOutAndReload = async () => {
    setBusy(true);
    try {
      await fetch("/api/user/logout", { method: "POST", credentials: "include" });
    } finally {
      window.location.reload();
    }
  };

  return (
    <>
      <div
        className="section"
        style={{ maxWidth: 720, margin: "0 auto", paddingBottom: 0 }}
      >
        <p style={{ fontSize: 14, color: "#4b5563", margin: "0 0 12px 0", lineHeight: 1.5 }}>
          If the menu still shows <strong>Members Console</strong>, this browser already has a member
          session. To sign in with a <em>different</em> email, sign out first.
        </p>
        <button
          type="button"
          className="button button-secondary"
          disabled={busy}
          onClick={() => void signOutAndReload()}
        >
          {busy ? "Signing out…" : "Sign out of current member account"}
        </button>
      </div>
      {children}
    </>
  );
}
