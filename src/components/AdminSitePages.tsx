"use client";

import { useEffect, useMemo, useState } from "react";
import type { SitePageCategory, SitePageEntry } from "@/lib/site-pages-index";

type SitePagesResponse = {
  pages: SitePageEntry[];
  grouped: Record<SitePageCategory, SitePageEntry[]>;
  counts: Record<SitePageCategory, number>;
  total: number;
  audioLandingNote?: string;
};

const CATEGORY_ORDER: SitePageCategory[] = [
  "marketing",
  "goals",
  "wellness",
  "blog",
  "audio"
];

export default function AdminSitePages() {
  const [data, setData] = useState<SitePagesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<SitePageCategory | "all">("all");

  useEffect(() => {
    fetch("/api/admin/site-pages", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Could not load site pages.");
        }
        return res.json() as Promise<SitePagesResponse>;
      })
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    let list = data.pages;
    if (category !== "all") {
      list = list.filter((row) => row.category === category);
    }
    if (!term) return list;
    return list.filter(
      (row) =>
        row.label.toLowerCase().includes(term) ||
        row.path.toLowerCase().includes(term) ||
        row.categoryLabel.toLowerCase().includes(term)
    );
  }, [data, search, category]);

  if (error) {
    return (
      <div className="card">
        <p style={{ color: "#b91c1c" }}>{error}</p>
      </div>
    );
  }

  if (!data) {
    return <div className="card"><p>Loading site pages…</p></div>;
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Site &amp; landing pages</h2>
      <p style={{ color: "#64748b", marginBottom: 8 }}>
        {data.total} URLs - marketing, goals, wellness, blog, and audio track landings. Open
        links to preview. To change wording on landings and blog articles, use{" "}
        <a href="/admin/copy">Page copy</a>.
      </p>
      {data.audioLandingNote && (
        <p style={{ color: "#0f766e", fontSize: 14, marginBottom: 16 }}>{data.audioLandingNote}</p>
      )}

      <div className="admin-filter-row" style={{ marginBottom: 16 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 160px", minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Search</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Title, path, or category…"
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", width: "100%" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 140px", minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SitePageCategory | "all")}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", width: "100%" }}
          >
            <option value="all">All ({data.total})</option>
            {CATEGORY_ORDER.map((cat) => (
              <option key={cat} value={cat}>
                {data.grouped[cat][0]?.categoryLabel || cat} ({data.counts[cat]})
              </option>
            ))}
          </select>
        </label>
      </div>

      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
        Showing {filtered.length} page{filtered.length === 1 ? "" : "s"}
      </p>

      <p className="admin-table-hint">Swipe sideways to see path and open link.</p>
      <div
        className="table-scroll"
        style={{
          maxHeight: 480,
          overflowY: "auto",
          border: "1px solid #e5e7eb",
          borderRadius: 8
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 480 }}>
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left" }}>
              <th style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb" }}>Category</th>
              <th style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb" }}>Label</th>
              <th style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb" }}>Path</th>
              <th style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb" }}>Open</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={`${row.category}-${row.path}`}>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" }}>
                  {row.categoryLabel}
                </td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" }}>
                  {row.label}
                </td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top", wordBreak: "break-all" }}>
                  <code style={{ fontSize: 12 }}>{row.path}</code>
                </td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" }}>
                  <a
                    href={row.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button button-secondary"
                    style={{ padding: "4px 10px", fontSize: 12 }}
                  >
                    View
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
