import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AudioTrackLandingPage from "@/components/AudioTrackLandingPage";
import {
  findAudioLandingBySlug,
  buildAllAudioLandingContent,
  findLibraryItemByAudioLandingSlug,
  isIndexableAudioLanding
} from "@/lib/audio-landing";
import { listLibrary } from "@/lib/db";

type PageProps = { params: { slug: string } };

export async function generateStaticParams() {
  const library = await listLibrary();
  return buildAllAudioLandingContent(library).map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const library = await listLibrary();
  const content = findAudioLandingBySlug(params.slug, library);
  if (!content) return { title: "Audio not found" };
  const item = findLibraryItemByAudioLandingSlug(params.slug, library);
  const indexable = item ? isIndexableAudioLanding(item) : false;
  return {
    title: content.metaTitle,
    description: content.metaDescription,
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      title: content.metaTitle,
      description: content.metaDescription
    }
  };
}

export default async function AudioLandingRoutePage({ params }: PageProps) {
  const library = await listLibrary();
  const content = findAudioLandingBySlug(params.slug, library);
  if (!content) notFound();
  return <AudioTrackLandingPage content={content} />;
}
