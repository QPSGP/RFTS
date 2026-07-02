import type { AudioLandingCard } from "@/lib/audio-landing-relations";

type RelatedAudioLandingsProps = {
  heading: string;
  audios: AudioLandingCard[];
};

export default function RelatedAudioLandings({ heading, audios }: RelatedAudioLandingsProps) {
  if (audios.length === 0) return null;

  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="section-head">
        <span className="eyebrow">Library</span>
        <h2 className="section-title">{heading}</h2>
      </div>
      <div className="stack" style={{ gap: 12 }}>
        {audios.map((audio) => (
          <a
            key={audio.slug}
            href={audio.path}
            className="card"
            style={{ display: "block", textDecoration: "none", color: "inherit" }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>
              {audio.skuCode ? `${audio.skuCode} — ${audio.title}` : audio.title}
            </h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>
              {audio.summary.length > 180 ? `${audio.summary.slice(0, 177).trim()}…` : audio.summary}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}
