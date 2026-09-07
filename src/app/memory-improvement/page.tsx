import { buildTopicLandingPage } from "@/lib/topic-landing-route";

export const dynamic = "force-dynamic";

const { generateMetadata, Page } = buildTopicLandingPage("memory-improvement");
export { generateMetadata };
export default Page;
