import { buildTopicLandingPage } from "@/lib/topic-landing-route";

export const dynamic = "force-dynamic";

const { generateMetadata, Page } = buildTopicLandingPage("blood-pressure-regulation");
export { generateMetadata };
export default Page;
