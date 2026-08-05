import type { CSSProperties } from "react";
import {
  MEDITATION_SOURCES,
  SCIENCE_OUTCOME_LINKS,
  WELLNESS_BENEFIT_LINKS
} from "@/lib/meditation-benefits";

export function BenefitLearnHowLink({ label, path }: { label: string; path: string }) {
  return (
    <a
      href={path}
      className="card"
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease"
      }}
      aria-label={`${label} - Learn How`}
    >
      {label} <span className="learn-how-link">Learn How</span>
    </a>
  );
}

export function HomeWellnessBenefitsGrid() {
  return (
    <section className="grid grid-2" style={{ marginTop: 16 }}>
      {WELLNESS_BENEFIT_LINKS.map((benefit) => (
        <BenefitLearnHowLink key={benefit.label} label={benefit.label} path={benefit.path} />
      ))}
    </section>
  );
}

export function ScienceOutcomesGrid() {
  return (
    <div className="grid grid-3">
      {SCIENCE_OUTCOME_LINKS.map((outcome) => (
        <BenefitLearnHowLink key={outcome.label} label={outcome.label} path={outcome.path} />
      ))}
    </div>
  );
}

/** Same Sources card used on Home and Science (Research and reading). */
export function MeditationSourcesCard({
  idPrefix,
  style
}: {
  idPrefix: string;
  style?: CSSProperties;
}) {
  return (
    <div className="card" style={style}>
      <h3>Sources</h3>
      <ol>
        {MEDITATION_SOURCES.map((source, index) => (
          <li key={source.href} id={`${idPrefix}-${index + 1}`}>
            <a
              className="source-link"
              href={source.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {source.title}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
