import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { listLibrary } from "@/lib/db";
import {
  buildSitePageIndex,
  groupSitePagesByCategory,
  SITE_PAGE_CATEGORIES,
  type SitePageCategory
} from "@/lib/site-pages-index";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const library = await listLibrary();
  const pages = buildSitePageIndex(library);
  const grouped = groupSitePagesByCategory(pages);

  const counts = Object.fromEntries(
    SITE_PAGE_CATEGORIES.map((cat) => [cat, grouped[cat].length])
  ) as Record<SitePageCategory, number>;

  return NextResponse.json({
    pages,
    grouped,
    counts,
    total: pages.length,
    audioLandingNote:
      "Audio track landings are not linked from the public site yet. Use this list to preview /audio/… URLs."
  });
}
