import { LGD_CGMR_USAGE } from "@/lib/lgd-intake";

type Props = {
  /** Compact styling for stacking under other console cards. */
  compact?: boolean;
};

/** Post-delivery / post-LGD listening guidance for members. */
export default function LgdCgmrUsageCard({ compact = false }: Props) {
  return (
    <section
      className="card"
      style={{
        marginBottom: compact ? 0 : 16,
        background: "linear-gradient(165deg, #ecfdf5 0%, #fff 50%)",
        border: "1px solid #a7f3d0"
      }}
    >
      <h3 style={{ marginTop: 0 }}>{LGD_CGMR_USAGE.title}</h3>
      <p style={{ color: "#334155" }}>{LGD_CGMR_USAGE.lead}</p>
      <ul style={{ margin: "0 0 12px", paddingLeft: 18, color: "#475569", lineHeight: 1.5 }}>
        {LGD_CGMR_USAGE.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <p style={{ fontSize: 14, color: "#0f766e", marginBottom: 0 }}>{LGD_CGMR_USAGE.contactNote}</p>
      <p style={{ fontSize: 13, margin: "10px 0 0" }}>
        <a href="/life-guidance-discovery">About Life Guidance Discovery</a>
        {" · "}
        <a href="/member/lgd">Open LGD intake</a>
      </p>
    </section>
  );
}
