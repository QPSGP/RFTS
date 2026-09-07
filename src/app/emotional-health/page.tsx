import { buildTopicLandingPage } from "@/lib/topic-landing-route";

export const dynamic = "force-dynamic";

const { generateMetadata, Page } = buildTopicLandingPage("emotional-health");
export { generateMetadata };
export default Page;
