import type { Metadata } from "next";
import GoalLandingPage from "@/components/GoalLandingPage";
import { findRelatedAudioLandingsForGoal } from "@/lib/audio-landing-relations";
import { listLibrary } from "@/lib/db";
import { getGoalLandingPage, GOAL_SIGNUP_HREF, type GoalLandingSlug } from "@/lib/goal-landing-pages";
import { buildMarketingSignupHref } from "@/lib/marketing-signup";

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

  async function Page({
    searchParams
  }: {
    searchParams?: { ref?: string };
  }) {
    const library = await listLibrary();
    const relatedAudios = findRelatedAudioLandingsForGoal(slug, library);
    const signupHref = buildMarketingSignupHref(searchParams?.ref) || GOAL_SIGNUP_HREF;
    return (
      <GoalLandingPage
        content={pageContent}
        relatedAudios={relatedAudios}
        signupHref={signupHref}
      />
    );
  }

  return { metadata, Page };
}
