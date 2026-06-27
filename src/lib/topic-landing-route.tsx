import type { Metadata } from "next";
import TopicLandingPage from "@/components/TopicLandingPage";
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

  function Page() {
    return <TopicLandingPage content={pageContent} />;
  }

  return { metadata, Page };
}
