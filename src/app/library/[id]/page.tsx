import { notFound } from "next/navigation";
import AudioGate from "@/components/AudioGate";
import ScreenWakeToggle from "@/components/ScreenWakeToggle";
import { getLibrarySorted } from "@/lib/storage";

type PageProps = {
  params: { id: string };
};

export default function LibraryItemPage({ params }: PageProps) {
  const library = getLibrarySorted();
  const item = library.find((track) => track.id === params.id);

  if (!item) {
    notFound();
  }

  return (
    <main>
      <section style={{ marginBottom: 24 }}>
        <h1>Now Playing</h1>
        <p>Stream your selected audio session.</p>
      </section>
      <ScreenWakeToggle />
      <AudioGate item={item} />
    </main>
  );
}
