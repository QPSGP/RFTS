import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { getMarketingKpis, listAffiliates, listTopReferrers } from "@/lib/db";
import { getBlogCadenceStatus } from "@/lib/blog-weekly-plan";
import { getBlogPostsNewestFirst } from "@/lib/blog-posts";
import { getMarketingAffiliateCode } from "@/lib/marketing-signup";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [kpis, referrers, affiliates] = await Promise.all([
    getMarketingKpis(),
    listTopReferrers(20),
    listAffiliates()
  ]);

  const nameByCode = new Map<string, string>();
  for (const a of affiliates) {
    if (a.affiliateCode) {
      nameByCode.set(a.affiliateCode.toUpperCase(), a.name || a.email || a.affiliateCode);
    }
  }
  const marketingRef = getMarketingAffiliateCode();
  const affiliateSnapshot = referrers.map((r) => {
    const code = (r.code || "").toUpperCase();
    return {
      code,
      name:
        nameByCode.get(code) ||
        (marketingRef && code === marketingRef ? "House / marketing code" : code),
      signups: r.signups,
      active: r.active
    };
  });

  const posts = getBlogPostsNewestFirst();
  const cadence = getBlogCadenceStatus(posts);
  const blogCadence = {
    due: cadence.due,
    daysSinceLatest: cadence.daysSinceLatest,
    latestPublishedAt: cadence.latestPublishedAt,
    latestTitle: cadence.latestTitle,
    totalPosts: posts.length,
    publishedThisWeek: cadence.publishedThisWeek,
    target: cadence.target,
    expectedByToday: cadence.expectedByToday,
    message: cadence.message,
    weekStartIso: cadence.weekStartIso,
    weekEndIso: cadence.weekEndIso,
    nextTopic: {
      label: cadence.nextTopic.label,
      path: cadence.nextTopic.path,
      kind: cadence.nextTopic.kind
    },
    signupPath: cadence.signupPath
  };

  const res = NextResponse.json({
    kpis,
    blogCadence,
    affiliateSnapshot,
    marketingRef
  });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}
