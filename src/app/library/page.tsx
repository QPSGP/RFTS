import { listInterests, listLibrary } from "@/lib/db";
import LibraryBrowser from "@/components/LibraryBrowser";
import ScreenWakeToggle from "@/components/ScreenWakeToggle";

export default async function LibraryPage() {
  const [library, interests] = await Promise.all([
    listLibrary(),
    listInterests()
  ]);

  return (
    <main>
      <section id="library-top" style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>Audio Library</h1>
          <p>Browse and stream the latest guided audio sessions.</p>
        </div>
        <a className="button button-secondary" href="/play-options">
          ← Back to Console
        </a>
      </section>
      <ScreenWakeToggle />
      <LibraryBrowser interests={interests} library={library} />
      <section style={{ textAlign: "center", paddingTop: 24, marginTop: 24, borderTop: "1px solid #e5e7eb" }}>
        <a className="button button-secondary" href="/play-options">
          ← Back to Console
        </a>
      </section>
    </main>
  );
}
