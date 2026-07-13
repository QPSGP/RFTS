import type { Metadata } from "next";
import TopicLandingPage from "@/components/TopicLandingPage";
import { findRelatedAudioLandingsForTopic } from "@/lib/audio-landing-relations";
import { listLibrary } from "@/lib/db";
import { getTopicLandingPage, TOPIC_SIGNUP_HREF, type TopicLandingSlug } from "@/lib/topic-landing-pages";
import { buildMarketingSignupHref } from "@/lib/marketing-signup";

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

  async function Page({
    searchParams
  }: {
    searchParams?: { ref?: string };
  }) {
    const library = await listLibrary();
    const relatedAudios = findRelatedAudioLandingsForTopic(slug, library);
    const signupHref = buildMarketingSignupHref(searchParams?.ref) || TOPIC_SIGNUP_HREF;
    return (
      <TopicLandingPage
        content={pageContent}
        relatedAudios={relatedAudios}
        signupHref={signupHref}
      />
    );
  }

  return { metadata, Page };
}
