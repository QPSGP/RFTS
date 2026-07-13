import { HOMEPAGE_GOAL_CARDS } from "@/lib/homepage-goals";
import { WELLNESS_BENEFIT_LINKS } from "@/lib/meditation-benefits";
import { buildAffiliatePageUrl, normalizeAffiliateCode } from "@/lib/affiliate-code";
import { SIGNUP_PATH } from "@/lib/marketing-signup";
import { getPublicSiteUrl } from "@/lib/site-url";

export type AffiliateShareLink = {
  label: string;
  path: string;
  url: string;
  kind: "signup" | "home" | "wellness" | "goal" | "blog";
};

/** Curated pages affiliates can share — each URL includes their `?ref=` code. */
export function buildAffiliateShareLinks(
  affiliateCode: string,
  baseUrl?: string
): AffiliateShareLink[] {
  const code = normalizeAffiliateCode(affiliateCode);
  const base = (baseUrl || getPublicSiteUrl()).replace(/\/$/, "");
  if (!code) return [];

  const links: AffiliateShareLink[] = [
    {
      label: "14-day free trial (signup)",
      path: SIGNUP_PATH,
      url: buildAffiliatePageUrl(SIGNUP_PATH, code, base),
      kind: "signup"
    },
    {
      label: "Homepage",
      path: "/",
      url: buildAffiliatePageUrl("/", code, base),
      kind: "home"
    },
    {
      label: "Blog & articles",
      path: "/blog",
      url: buildAffiliatePageUrl("/blog", code, base),
      kind: "blog"
    }
  ];

  const wellnessSeen = new Set<string>();
  for (const benefit of WELLNESS_BENEFIT_LINKS) {
    if (wellnessSeen.has(benefit.path)) continue;
    wellnessSeen.add(benefit.path);
    links.push({
      label: benefit.label,
      path: benefit.path,
      url: buildAffiliatePageUrl(benefit.path, code, base),
      kind: "wellness"
    });
  }

  for (const goal of HOMEPAGE_GOAL_CARDS) {
    links.push({
      label: `${goal.label} goal`,
      path: goal.path,
      url: buildAffiliatePageUrl(goal.path, code, base),
      kind: "goal"
    });
  }

  return links;
}
