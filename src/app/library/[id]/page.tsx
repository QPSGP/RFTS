import Link from "next/link";
import { notFound } from "next/navigation";
import AudioGate from "@/components/AudioGate";
import ScreenWakeToggle from "@/components/ScreenWakeToggle";
import { getLibraryItem, getPlaybackSettings } from "@/lib/db";

type PageProps = {
  params: { id: string };
};

export default async function LibraryItemPage({ params }: PageProps) {
  const [item, settings] = await Promise.all([
    getLibraryItem(params.id),
    getPlaybackSettings()
  ]);

  if (!item) {
    notFound();
  }

  const fallbackCode = (settings.fallbackTrackId || "T-18").trim().toUpperCase();
  const isFallbackTrack =
    !!fallbackCode &&
    ((item.skuCode || "").toUpperCase().includes(fallbackCode) ||
      (item.title || "").toUpperCase().includes(fallbackCode));

  return (
    <main>
      <AudioGate item={item} isFallbackTrack={isFallbackTrack} />
      <ScreenWakeToggle />
      <section style={{ textAlign: "center", paddingTop: 24, marginTop: 24, borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
        <Link className="button button-secondary" href="/library">
          ← Back to Library
        </Link>
        <Link className="button button-secondary" href="/play-options">
          ← Back to Console
        </Link>
      </section>
    </main>
  );
}
