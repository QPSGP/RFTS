import { buildTopicLandingPage } from "@/lib/topic-landing-route";

export const dynamic = "force-dynamic";

const { generateMetadata, Page } = buildTopicLandingPage("pain-relief");
export { generateMetadata };
export default Page;
