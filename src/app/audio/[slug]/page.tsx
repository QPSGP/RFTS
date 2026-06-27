import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AudioTrackLandingPage from "@/components/AudioTrackLandingPage";
import { findAudioLandingBySlug, buildAllAudioLandingContent } from "@/lib/audio-landing";
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
  return {
    title: content.metaTitle,
    description: content.metaDescription,
    robots: { index: false, follow: false },
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
