import { CLARITY_PROJECT_ID, getClarityDashboardUrl } from "@/lib/clarity";

type AdminClarityLinkProps = {
  /** Compact toolbar button vs card with short help text. */
  variant?: "button" | "card";
};

/** Opens the Microsoft Clarity dashboard for RFTS Production (admin access). */
export default function AdminClarityLink({ variant = "button" }: AdminClarityLinkProps) {
  const href = getClarityDashboardUrl();

  if (variant === "card") {
    return (
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Microsoft Clarity</h3>
        <p style={{ color: "#4b5563", marginBottom: 12 }}>
          Free session recordings and heatmaps for <strong>RFTS Production</strong> (project{" "}
          <code>{CLARITY_PROJECT_ID}</code>). Data usually appears within a few hours after deploy.
        </p>
        <a
          className="button"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Clarity dashboard
        </a>
      </div>
    );
  }

  return (
    <a
      className="button button-secondary"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ padding: "8px 12px", fontSize: 13 }}
      title="Microsoft Clarity - RFTS Production"
    >
      Clarity
    </a>
  );
}
