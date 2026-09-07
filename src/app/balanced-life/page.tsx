import { buildGoalLandingPage } from "@/lib/goal-landing-route";

export const dynamic = "force-dynamic";

const { generateMetadata, Page } = buildGoalLandingPage("balanced-life");
export { generateMetadata };
export default Page;
