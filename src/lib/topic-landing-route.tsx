import type { Metadata } from "next";
import TopicLandingPage from "@/components/TopicLandingPage";
import { findRelatedAudioLandingsForTopic } from "@/lib/audio-landing-relations";
import { listLibrary } from "@/lib/db";
import { TOPIC_SIGNUP_HREF, type TopicLandingSlug } from "@/lib/topic-landing-pages";
import { buildMarketingSignupHref } from "@/lib/marketing-signup";
import { resolveTopicLandingPage } from "@/lib/site-copy";

export function buildTopicLandingPage(slug: TopicLandingSlug) {
  async function generateMetadata(): Promise<Metadata> {
    const content = await resolveTopicLandingPage(slug);
    if (!content) {
      return { title: "Page not found" };
    }
    return {
      title: content.metaTitle,
      description: content.metaDescription,
      openGraph: {
        title: content.metaTitle,
        description: content.metaDescription
      }
    };
  }

  async function Page({
    searchParams
  }: {
    searchParams?: { ref?: string };
  }) {
    const content = await resolveTopicLandingPage(slug);
    if (!content) {
      throw new Error(`Unknown topic landing slug: ${slug}`);
    }
    const library = await listLibrary();
    const relatedAudios = findRelatedAudioLandingsForTopic(slug, library);
    const signupHref = buildMarketingSignupHref(searchParams?.ref) || TOPIC_SIGNUP_HREF;
    return (
      <TopicLandingPage
        content={content}
        relatedAudios={relatedAudios}
        signupHref={signupHref}
      />
    );
  }

  return { generateMetadata, Page };
}
