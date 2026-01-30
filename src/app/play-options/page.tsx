export default function PlayOptionsPage() {
  return (
    <main>
      <section style={{ marginBottom: 24 }}>
        <h1>Play Options</h1>
        <p>Choose how you want to listen: library or session play.</p>
      </section>
      <section className="grid">
        <div className="card" id="meditation-library">
          <h3>Meditation Library</h3>
          <p>
            Browse the full audio library and play any track on demand. This
            section mirrors the existing anchor.
          </p>
        </div>
        <div className="card" id="meditation-session">
          <h3>Meditation Session</h3>
          <p>
            Start a guided session tailored to your goals. This section mirrors
            the existing anchor.
          </p>
        </div>
      </section>
    </main>
  );
}
