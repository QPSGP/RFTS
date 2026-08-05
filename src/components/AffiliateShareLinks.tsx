"use client";

import { useCallback, useMemo, useState } from "react";
import { buildAffiliateShareLinks, type AffiliateShareLink } from "@/lib/affiliate-landing-links";

type Props = {
  affiliateCode: string;
};

function groupLabel(kind: AffiliateShareLink["kind"]): string {
  switch (kind) {
    case "signup":
      return "Primary";
    case "home":
    case "blog":
      return "Site";
    case "wellness":
      return "Wellness landing pages";
    case "goal":
      return "Goal landing pages";
    default:
      return "Links";
  }
}

export default function AffiliateShareLinks({ affiliateCode }: Props) {
  const links = useMemo(() => buildAffiliateShareLinks(affiliateCode), [affiliateCode]);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const copyUrl = useCallback(async (url: string, label: string, path: string) => {
    setCopyMessage(null);
    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage(`Copied: ${label}`);
      setCopiedPath(path);
      window.setTimeout(() => setCopiedPath(null), 2500);
    } catch {
      setCopyMessage(`Could not copy - select the link for ${label}.`);
      setCopiedPath(null);
    }
  }, []);

  if (!links.length) return null;

  const groups = ["signup", "home", "blog", "wellness", "goal"] as const;

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 17 }}>Share landing pages</h3>
      <p style={{ margin: "0 0 12px", fontSize: 14, color: "#4b5563" }}>
        Copy a link below. Each URL includes your affiliate number so signups from that page
        credit you. Visitors can browse the page and press Start Session - their trial signup
        keeps your <code>ref</code> for the session.
      </p>
      {groups.map((kind) => {
        const items = links.filter((link) => link.kind === kind);
        if (!items.length) return null;
        return (
          <div key={kind} style={{ marginBottom: 16 }}>
            <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#64748b" }}>
              {groupLabel(kind)}
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, listStyle: "disc" }}>
              {items.map((item) => {
                const justCopied = copiedPath === item.path;
                return (
                  <li key={item.path} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</div>
                    <div
                      style={{
                        fontSize: 12,
                        wordBreak: "break-all",
                        color: "#64748b",
                        margin: "4px 0 6px"
                      }}
                    >
                      {item.url}
                    </div>
                    <button
                      type="button"
                      className={`button button-secondary${justCopied ? " is-copied" : ""}`}
                      style={{ padding: "6px 12px", fontSize: 13 }}
                      onClick={() => copyUrl(item.url, item.label, item.path)}
                      aria-live="polite"
                    >
                      {justCopied ? "Copied!" : "Copy link"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      {copyMessage && (
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 14,
            fontWeight: 600,
            color: copyMessage.includes("Could not") ? "#b45309" : "#059669"
          }}
          role="status"
        >
          {copyMessage}
        </p>
      )}
    </div>
  );
}
