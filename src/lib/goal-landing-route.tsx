import type { Metadata } from "next";
import GoalLandingPage from "@/components/GoalLandingPage";
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

  function Page() {
    return <GoalLandingPage content={pageContent} />;
  }

  return { metadata, Page };
}
