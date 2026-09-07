import type { Metadata } from "next";
import GoalLandingPage from "@/components/GoalLandingPage";
import { findRelatedAudioLandingsForGoal } from "@/lib/audio-landing-relations";
import { listLibrary } from "@/lib/db";
import { GOAL_SIGNUP_HREF, type GoalLandingSlug } from "@/lib/goal-landing-pages";
import { buildMarketingSignupHref } from "@/lib/marketing-signup";
import { resolveGoalLandingPage } from "@/lib/site-copy";

export function buildGoalLandingPage(slug: GoalLandingSlug) {
  async function generateMetadata(): Promise<Metadata> {
    const content = await resolveGoalLandingPage(slug);
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
    const content = await resolveGoalLandingPage(slug);
    if (!content) {
      throw new Error(`Unknown goal landing slug: ${slug}`);
    }
    const library = await listLibrary();
    const relatedAudios = findRelatedAudioLandingsForGoal(slug, library);
    const signupHref = buildMarketingSignupHref(searchParams?.ref) || GOAL_SIGNUP_HREF;
    return (
      <GoalLandingPage
        content={content}
        relatedAudios={relatedAudios}
        signupHref={signupHref}
      />
    );
  }

  return { generateMetadata, Page };
}
