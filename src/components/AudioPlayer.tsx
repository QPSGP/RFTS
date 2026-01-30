"use client";

type AudioPlayerProps = {
  title: string;
  description: string;
  audioUrl: string;
  coverUrl: string;
};

export default function AudioPlayer({
  title,
  description,
  audioUrl,
  coverUrl
}: AudioPlayerProps) {
  return (
    <div className="card">
      <div
        style={{
          display: "grid",
          gap: 16,
          alignItems: "center"
        }}
      >
        <img
          src={coverUrl}
          alt={`${title} cover`}
          style={{
            width: "100%",
            maxWidth: 320,
            borderRadius: 12,
            border: "1px solid #e5e7eb"
          }}
        />
        <div>
          <h2 style={{ marginBottom: 8 }}>{title}</h2>
          <p style={{ color: "#4b5563", marginTop: 0 }}>{description}</p>
        </div>
        <audio controls style={{ width: "100%" }}>
          <source src={audioUrl} />
          Your browser does not support the audio element.
        </audio>
      </div>
    </div>
  );
}
