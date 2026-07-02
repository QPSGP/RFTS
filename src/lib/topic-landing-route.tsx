import type { Metadata } from "next";
import TopicLandingPage from "@/components/TopicLandingPage";
import { findRelatedAudioLandingsForTopic } from "@/lib/audio-landing-relations";
import { listLibrary } from "@/lib/db";
import { getTopicLandingPage, type TopicLandingSlug } from "@/lib/topic-landing-pages";

export function buildTopicLandingPage(slug: TopicLandingSlug) {
  const content = getTopicLandingPage(slug);
  if (!content) {
    throw new Error(`Unknown topic landing slug: ${slug}`);
  }
  const pageContent = content;

  const metadata: Metadata = {
    title: pageContent.metaTitle,
    description: pageContent.metaDescription,
    openGraph: {
      title: pageContent.metaTitle,
      description: pageContent.metaDescription
    }
  };

  async function Page() {
    const library = await listLibrary();
    const relatedAudios = findRelatedAudioLandingsForTopic(slug, library);
    return <TopicLandingPage content={pageContent} relatedAudios={relatedAudios} />;
  }

  return { metadata, Page };
}
