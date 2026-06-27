import { buildTopicLandingPage } from "@/lib/topic-landing-route";

const { metadata, Page } = buildTopicLandingPage("blood-pressure-regulation");
export { metadata };
export default Page;
