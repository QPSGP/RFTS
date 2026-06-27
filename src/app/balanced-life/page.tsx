import { buildGoalLandingPage } from "@/lib/goal-landing-route";

const { metadata, Page } = buildGoalLandingPage("balanced-life");
export { metadata };
export default Page;
