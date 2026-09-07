"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import AdminClarityLink from "@/components/AdminClarityLink";
import AdminSiteCopy from "@/components/AdminSiteCopy";

export default function AdminCopyPage() {
  const [status, setStatus] = useState<"loading" | "ready" | "unauthorized">("loading");

  useEffect(() => {
    fetch("/api/admin/site-copy", { credentials: "include", cache: "no-store" })
      .then((res) => setStatus(res.ok ? "ready" : "unauthorized"))
      .catch(() => setStatus("unauthorized"));
  }, []);

  if (status === "unauthorized") {
    return (
      <main className="admin-page">
        <section style={{ marginBottom: 24 }}>
          <h1>Page copy</h1>
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
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12
        }}
      >
        <h1 style={{ margin: 0 }}>Page copy</h1>
        <div className="admin-toolbar">
          <Link href="/admin/content" className="button button-secondary" style={{ padding: "8px 12px", fontSize: 13 }}>
            Content Console
          </Link>
          <Link href="/admin/marketing" className="button button-secondary" style={{ padding: "8px 12px", fontSize: 13 }}>
            Marketing
          </Link>
          <AdminClarityLink />
          <AdminLogoutButton />
        </div>
      </section>
      {status === "loading" ? <div className="card">Checking access...</div> : <AdminSiteCopy />}
    </main>
  );
}
