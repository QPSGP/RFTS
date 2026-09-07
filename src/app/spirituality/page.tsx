import { buildGoalLandingPage } from "@/lib/goal-landing-route";

export const dynamic = "force-dynamic";

const { generateMetadata, Page } = buildGoalLandingPage("spirituality");
export { generateMetadata };
export default Page;
