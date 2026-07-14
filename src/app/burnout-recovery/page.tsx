import { buildTopicLandingPage } from "@/lib/topic-landing-route";

const { metadata, Page } = buildTopicLandingPage("burnout-recovery");
export { metadata };
export default Page;
