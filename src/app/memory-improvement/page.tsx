import type { Metadata } from "next";
import TopicLandingPage from "@/components/TopicLandingPage";
import { getTopicLandingPage } from "@/lib/topic-landing-pages";

const SLUG = "memory-improvement";
const content = getTopicLandingPage(SLUG)!;

export const metadata: Metadata = {
  title: content.metaTitle,
  description: content.metaDescription,
  openGraph: {
    title: content.metaTitle,
    description: content.metaDescription
  }
};

export default function MemoryImprovementLandingPage() {
  return <TopicLandingPage content={content} />;
}
