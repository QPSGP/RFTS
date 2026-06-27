import type { Metadata } from "next";
import TopicLandingPage from "@/components/TopicLandingPage";
import { getTopicLandingPage } from "@/lib/topic-landing-pages";

const SLUG = "sleep-meditation";
const content = getTopicLandingPage(SLUG)!;

export const metadata: Metadata = {
  title: content.metaTitle,
  description: content.metaDescription,
  openGraph: {
    title: content.metaTitle,
    description: content.metaDescription
  }
};

export default function SleepMeditationLandingPage() {
  return <TopicLandingPage content={content} />;
}
