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
      <section style={{ marginBottom: 24 }}>
        <h1>Audio Library</h1>
        <p>Browse and stream the latest guided audio sessions.</p>
      </section>
      <ScreenWakeToggle />
      <LibraryBrowser interests={interests} library={library} />
    </main>
  );
}
