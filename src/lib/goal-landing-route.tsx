import type { Metadata } from "next";
import GoalLandingPage from "@/components/GoalLandingPage";
import { findRelatedAudioLandingsForGoal } from "@/lib/audio-landing-relations";
import { listLibrary } from "@/lib/db";
import { getGoalLandingPage, type GoalLandingSlug } from "@/lib/goal-landing-pages";

export function buildGoalLandingPage(slug: GoalLandingSlug) {
  const content = getGoalLandingPage(slug);
  if (!content) {
    throw new Error(`Unknown goal landing slug: ${slug}`);
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
    const relatedAudios = findRelatedAudioLandingsForGoal(slug, library);
    return <GoalLandingPage content={pageContent} relatedAudios={relatedAudios} />;
  }

  return { metadata, Page };
}
