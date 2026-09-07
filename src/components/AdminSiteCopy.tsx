"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import type { BlogCopyOverlay, GoalCopyOverlay, SiteCopyCatalogEntry, TitledBody, TopicCopyOverlay } from "@/lib/site-copy";

type EditorKind = "goal" | "topic" | "blog";

type EditorPayload = {
  path: string;
  kind: EditorKind;
  slug: string;
  label: string;
  defaults: GoalCopyOverlay | TopicCopyOverlay | BlogCopyOverlay;
  current: GoalCopyOverlay | TopicCopyOverlay | BlogCopyOverlay;
  customized: boolean;
  updatedAt?: string;
  updatedBy?: string | null;
};

const KIND_ORDER: EditorKind[] = ["goal", "topic", "blog"];

function fieldLabel(name: string): string {
  const labels: Record<string, string> = {
    label: "Short name",
    tagline: "Tagline",
    pill: "Short name",
    title: "Headline",
    metaTitle: "Browser / search title",
    metaDescription: "Search description",
    heroLead: "Intro paragraph",
    eyebrow: "Small label above section",
    sectionTitle: "Section title",
    sectionSubtitle: "Section subtitle",
    excerpt: "Summary",
    readMinutes: "Read time (minutes)",
    sessionTitle: "Transcript label",
    quote: "Transcript excerpt",
    heading: "Section heading",
    cardTitle: "Card title",
    body: "Body text",
    paragraphs: "Paragraphs (blank line between)"
  };
  return labels[name] || name;
}

function inputStyle(): CSSProperties {
  return { padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", width: "100%" };
}

export default function AdminSiteCopy() {
  const [pages, setPages] = useState<SiteCopyCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<EditorKind | "all">("all");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorPayload | null>(null);
  const [draft, setDraft] = useState<GoalCopyOverlay | TopicCopyOverlay | BlogCopyOverlay | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadList = useCallback(() => {
    fetch("/api/admin/site-copy", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not load pages.");
        setPages(data.pages || []);
      })
      .catch((err: Error) => setStatus(`Error: ${err.message}`))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openEditor = async (path: string) => {
    setStatus(null);
    setSelectedPath(path);
    setEditor(null);
    setDraft(null);
    const res = await fetch(`/api/admin/site-copy?path=${encodeURIComponent(path)}`, {
      credentials: "include",
      cache: "no-store"
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(`Error: ${data.error || "Could not load page copy."}`);
      return;
    }
    setEditor(data as EditorPayload);
    setDraft(data.current);
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return pages.filter((page) => {
      if (kindFilter !== "all" && page.kind !== kindFilter) return false;
      if (!term) return true;
      return (
        page.label.toLowerCase().includes(term) ||
        page.path.toLowerCase().includes(term) ||
        page.kindLabel.toLowerCase().includes(term)
      );
    });
  }, [pages, search, kindFilter]);

  const grouped = useMemo(() => {
    const groups: Record<EditorKind, SiteCopyCatalogEntry[]> = { goal: [], topic: [], blog: [] };
    for (const page of filtered) groups[page.kind].push(page);
    return groups;
  }, [filtered]);

  const save = async () => {
    if (!editor || !draft) return;
    setSaving(true);
    setStatus(null);
    const res = await fetch("/api/admin/site-copy", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: editor.path, content: draft })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(`Error: ${data.error || "Save failed."}`);
      setSaving(false);
      return;
    }
    setStatus(data.customized ? "Saved. The live page now uses this wording." : "Saved. Copy matches the original.");
    setSaving(false);
    loadList();
    openEditor(editor.path);
  };

  const reset = async () => {
    if (!editor) return;
    if (!window.confirm("Restore the original wording for this page?")) return;
    setSaving(true);
    setStatus(null);
    const res = await fetch(`/api/admin/site-copy?path=${encodeURIComponent(editor.path)}`, {
      method: "DELETE",
      credentials: "include"
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(`Error: ${data.error || "Reset failed."}`);
      setSaving(false);
      return;
    }
    setStatus("Restored original wording.");
    setSaving(false);
    loadList();
    openEditor(editor.path);
  };

  if (loading) {
    return <div className="card">Loading pages...</div>;
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Page copy</h2>
        <p style={{ color: "#64748b", marginBottom: 16 }}>
          Change wording on goal landings, wellness landings, and blog articles. Layout stays the
          same. New pages still need to be added in code.
        </p>
        <div className="admin-filter-row" style={{ marginBottom: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 180px" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Search</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title or path"
              style={inputStyle()}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: "0 1 200px" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Type</span>
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as EditorKind | "all")}
              style={inputStyle()}
            >
              <option value="all">All</option>
              <option value="goal">Goal landings</option>
              <option value="topic">Wellness landings</option>
              <option value="blog">Blog articles</option>
            </select>
          </label>
        </div>
        {KIND_ORDER.map((kind) => {
          const rows = grouped[kind];
          if (!rows.length) return null;
          return (
            <div key={kind} style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, margin: "0 0 8px" }}>{rows[0].kindLabel}</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {rows.map((page) => (
                  <li key={page.path} style={{ marginBottom: 6 }}>
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{
                        width: "100%",
                        textAlign: "left",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        background: selectedPath === page.path ? "#ecfdf5" : undefined
                      }}
                      onClick={() => openEditor(page.path)}
                    >
                      <span>
                        {page.label}{" "}
                        <span style={{ color: "#6b7280", fontWeight: 400 }}>{page.path}</span>
                      </span>
                      {page.customized && (
                        <span style={{ fontSize: 12, color: "#0f766e", fontWeight: 600 }}>Edited</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {editor && draft && (
        <CopyEditorForm
          editor={editor}
          draft={draft}
          setDraft={setDraft}
          saving={saving}
          status={status}
          onSave={save}
          onReset={reset}
          onClose={() => {
            setEditor(null);
            setDraft(null);
            setSelectedPath(null);
          }}
        />
      )}
    </div>
  );
}

function CopyEditorForm({
  editor,
  draft,
  setDraft,
  saving,
  status,
  onSave,
  onReset,
  onClose
}: {
  editor: EditorPayload;
  draft: GoalCopyOverlay | TopicCopyOverlay | BlogCopyOverlay;
  setDraft: (next: GoalCopyOverlay | TopicCopyOverlay | BlogCopyOverlay) => void;
  saving: boolean;
  status: string | null;
  onSave: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 4 }}>{editor.label}</h2>
          <p style={{ color: "#64748b", margin: 0 }}>{editor.path}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a className="button button-secondary" href={editor.path} target="_blank" rel="noreferrer">
            Preview live page
          </a>
          <button type="button" className="button button-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      {editor.customized && (
        <p style={{ fontSize: 13, color: "#0f766e" }}>
          This page has custom wording
          {editor.updatedBy ? ` (last saved by ${editor.updatedBy})` : ""}.
        </p>
      )}
      {editor.kind === "goal" && (
        <GoalFields value={draft as GoalCopyOverlay} onChange={setDraft} />
      )}
      {editor.kind === "topic" && (
        <TopicFields value={draft as TopicCopyOverlay} onChange={setDraft} />
      )}
      {editor.kind === "blog" && (
        <BlogFields value={draft as BlogCopyOverlay} onChange={setDraft} />
      )}
      {status && (
        <p
          className={`status-message ${status.startsWith("Error:") ? "status-message--error" : "status-message--success"}`}
          role="status"
        >
          {status}
        </p>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <button className="button" type="button" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save wording"}
        </button>
        <button className="button button-secondary" type="button" onClick={onReset} disabled={saving}>
          Restore original
        </button>
      </div>
    </div>
  );
}

function TextField({
  name,
  value,
  onChange,
  multiline = false,
  rows = 3
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{fieldLabel(name)}</span>
      {multiline ? (
        <textarea
          className="input"
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle()}
        />
      ) : (
        <input
          className="input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle()}
        />
      )}
    </label>
  );
}

function TitledBodyList({
  heading,
  items,
  onChange
}: {
  heading: string;
  items: TitledBody[];
  onChange: (items: TitledBody[]) => void;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 15, margin: "0 0 8px" }}>{heading}</h3>
      {items.map((item, index) => (
        <div key={index} className="card" style={{ marginBottom: 8, background: "#f9fafb" }}>
          <TextField
            name="cardTitle"
            value={item.title}
            onChange={(title) =>
              onChange(items.map((row, i) => (i === index ? { ...row, title } : row)))
            }
          />
          <TextField
            name="body"
            value={item.body}
            multiline
            onChange={(body) =>
              onChange(items.map((row, i) => (i === index ? { ...row, body } : row)))
            }
          />
        </div>
      ))}
    </div>
  );
}

function GoalFields({
  value,
  onChange
}: {
  value: GoalCopyOverlay;
  onChange: (next: GoalCopyOverlay) => void;
}) {
  const set = (patch: Partial<GoalCopyOverlay>) => onChange({ ...value, ...patch });
  return (
    <div style={{ marginTop: 16 }}>
      <TextField name="label" value={value.label || ""} onChange={(label) => set({ label })} />
      <TextField name="tagline" value={value.tagline || ""} onChange={(tagline) => set({ tagline })} />
      <TextField name="title" value={value.title || ""} onChange={(title) => set({ title })} />
      <TextField
        name="metaTitle"
        value={value.metaTitle || ""}
        onChange={(metaTitle) => set({ metaTitle })}
      />
      <TextField
        name="metaDescription"
        value={value.metaDescription || ""}
        multiline
        onChange={(metaDescription) => set({ metaDescription })}
      />
      <TextField
        name="heroLead"
        value={value.heroLead || ""}
        multiline
        rows={4}
        onChange={(heroLead) => set({ heroLead })}
      />
      <TextField name="eyebrow" value={value.eyebrow || ""} onChange={(eyebrow) => set({ eyebrow })} />
      <TextField
        name="sectionTitle"
        value={value.sectionTitle || ""}
        onChange={(sectionTitle) => set({ sectionTitle })}
      />
      <TextField
        name="sectionSubtitle"
        value={value.sectionSubtitle || ""}
        multiline
        onChange={(sectionSubtitle) => set({ sectionSubtitle })}
      />
      <TitledBodyList
        heading="How it helps"
        items={value.howItHelps || []}
        onChange={(howItHelps) => set({ howItHelps })}
      />
      <TitledBodyList
        heading="Nightly steps"
        items={value.nightlySteps || []}
        onChange={(nightlySteps) => set({ nightlySteps })}
      />
    </div>
  );
}

function TopicFields({
  value,
  onChange
}: {
  value: TopicCopyOverlay;
  onChange: (next: TopicCopyOverlay) => void;
}) {
  const set = (patch: Partial<TopicCopyOverlay>) => onChange({ ...value, ...patch });
  return (
    <div style={{ marginTop: 16 }}>
      <TextField name="pill" value={value.pill || ""} onChange={(pill) => set({ pill })} />
      <TextField name="title" value={value.title || ""} onChange={(title) => set({ title })} />
      <TextField
        name="metaTitle"
        value={value.metaTitle || ""}
        onChange={(metaTitle) => set({ metaTitle })}
      />
      <TextField
        name="metaDescription"
        value={value.metaDescription || ""}
        multiline
        onChange={(metaDescription) => set({ metaDescription })}
      />
      <TextField
        name="heroLead"
        value={value.heroLead || ""}
        multiline
        rows={4}
        onChange={(heroLead) => set({ heroLead })}
      />
      <TextField name="eyebrow" value={value.eyebrow || ""} onChange={(eyebrow) => set({ eyebrow })} />
      <TextField
        name="sectionTitle"
        value={value.sectionTitle || ""}
        onChange={(sectionTitle) => set({ sectionTitle })}
      />
      <TextField
        name="sectionSubtitle"
        value={value.sectionSubtitle || ""}
        multiline
        onChange={(sectionSubtitle) => set({ sectionSubtitle })}
      />
      <TitledBodyList
        heading="How it helps"
        items={value.howItHelps || []}
        onChange={(howItHelps) => set({ howItHelps })}
      />
      <TitledBodyList
        heading="Nightly steps"
        items={value.nightlySteps || []}
        onChange={(nightlySteps) => set({ nightlySteps })}
      />
    </div>
  );
}

function BlogFields({
  value,
  onChange
}: {
  value: BlogCopyOverlay;
  onChange: (next: BlogCopyOverlay) => void;
}) {
  const set = (patch: Partial<BlogCopyOverlay>) => onChange({ ...value, ...patch });
  const sections = value.sections || [];
  return (
    <div style={{ marginTop: 16 }}>
      <TextField name="title" value={value.title || ""} onChange={(title) => set({ title })} />
      <TextField
        name="metaTitle"
        value={value.metaTitle || ""}
        onChange={(metaTitle) => set({ metaTitle })}
      />
      <TextField
        name="metaDescription"
        value={value.metaDescription || ""}
        multiline
        onChange={(metaDescription) => set({ metaDescription })}
      />
      <TextField
        name="excerpt"
        value={value.excerpt || ""}
        multiline
        onChange={(excerpt) => set({ excerpt })}
      />
      <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{fieldLabel("readMinutes")}</span>
        <input
          className="input"
          type="number"
          min={1}
          max={60}
          value={value.readMinutes ?? 5}
          onChange={(e) => set({ readMinutes: Number(e.target.value) || 1 })}
          style={{ ...inputStyle(), maxWidth: 120 }}
        />
      </label>
      <h3 style={{ fontSize: 15, margin: "8px 0" }}>Article sections</h3>
      {sections.map((section, index) => (
        <div key={index} className="card" style={{ marginBottom: 8, background: "#f9fafb" }}>
          <TextField
            name="heading"
            value={section.heading || ""}
            onChange={(heading) =>
              set({
                sections: sections.map((row, i) => (i === index ? { ...row, heading } : row))
              })
            }
          />
          <TextField
            name="paragraphs"
            value={(section.paragraphs || []).join("\n\n")}
            multiline
            rows={6}
            onChange={(text) =>
              set({
                sections: sections.map((row, i) =>
                  i === index
                    ? {
                        ...row,
                        paragraphs: text
                          .split(/\n\s*\n/)
                          .map((paragraph) => paragraph.trim())
                          .filter(Boolean)
                      }
                    : row
                )
              })
            }
          />
        </div>
      ))}
      <h3 style={{ fontSize: 15, margin: "8px 0" }}>Transcript excerpt</h3>
      <TextField
        name="sessionTitle"
        value={value.transcriptExcerpt?.sessionTitle || ""}
        onChange={(sessionTitle) =>
          set({
            transcriptExcerpt: {
              sessionTitle,
              quote: value.transcriptExcerpt?.quote || ""
            }
          })
        }
      />
      <TextField
        name="quote"
        value={value.transcriptExcerpt?.quote || ""}
        multiline
        onChange={(quote) =>
          set({
            transcriptExcerpt: {
              sessionTitle: value.transcriptExcerpt?.sessionTitle || "",
              quote
            }
          })
        }
      />
    </div>
  );
}
