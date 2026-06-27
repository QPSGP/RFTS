import { buildTopicLandingPage } from "@/lib/topic-landing-route";

const { metadata, Page } = buildTopicLandingPage("self-awareness");
export { metadata };
export default Page;
