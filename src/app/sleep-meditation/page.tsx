import { buildTopicLandingPage } from "@/lib/topic-landing-route";

const { metadata, Page } = buildTopicLandingPage("sleep-meditation");
export { metadata };
export default Page;
