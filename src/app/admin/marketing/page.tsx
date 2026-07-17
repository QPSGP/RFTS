"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import AdminMarketing from "@/components/AdminMarketing";

export default function AdminMarketingPage() {
  const [status, setStatus] = useState<"loading" | "ready" | "unauthorized">("loading");

  useEffect(() => {
    fetch("/api/admin/marketing", { credentials: "include", cache: "no-store" })
      .then((res) => {
        setStatus(res.ok ? "ready" : "unauthorized");
      })
      .catch(() => setStatus("unauthorized"));
  }, []);

  if (status === "unauthorized") {
    return (
      <main className="admin-page">
        <section style={{ marginBottom: 24 }}>
          <h1>Marketing</h1>
          <p>Admin login required.</p>
          <Link href="/login" className="button">
            Log in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <section
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12
        }}
      >
        <div>
          <h1>Marketing</h1>
          <p>Overview, blog cadence, share links, outreach tracker, affiliate snapshot, and reference.</p>
        </div>
        <div className="admin-toolbar">
          <Link
            href="/admin/dashboard"
            className="button button-secondary"
            style={{ padding: "8px 12px", fontSize: 13 }}
          >
            Activity Dashboard
          </Link>
          <Link
            href="/admin/content"
            className="button button-secondary"
            style={{ padding: "8px 12px", fontSize: 13 }}
          >
            Content Console
          </Link>
          <AdminLogoutButton />
        </div>
      </section>

      {status === "loading" ? <p>Loading…</p> : <AdminMarketing />}
    </main>
  );
}
