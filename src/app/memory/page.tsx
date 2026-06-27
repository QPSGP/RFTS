import { buildGoalLandingPage } from "@/lib/goal-landing-route";

const { metadata, Page } = buildGoalLandingPage("memory");
export { metadata };
export default Page;
