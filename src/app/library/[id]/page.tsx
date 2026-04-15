import Link from "next/link";
import { notFound } from "next/navigation";
import AudioGate from "@/components/AudioGate";
import PlaySecondRecordingCta from "@/components/PlaySecondRecordingCta";
import ScreenWakeToggle from "@/components/ScreenWakeToggle";
import { getLibraryItem } from "@/lib/db";

type PageProps = {
  params: { id: string };
};

export default async function LibraryItemPage({ params }: PageProps) {
  const item = await getLibraryItem(params.id);

  if (!item) {
    notFound();
  }

  return (
    <main>
      <AudioGate item={item} />
      <PlaySecondRecordingCta />
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
