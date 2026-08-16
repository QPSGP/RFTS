import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getPublicSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/moderator/", "/member/", "/login", "/lead/", "/lead-card-extracts/"]
    },
    sitemap: `${base}/sitemap.xml`
  };
}
