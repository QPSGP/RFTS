import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { PRODUCTION_SITE_HOST, PRODUCTION_SITE_URL } from "@/lib/site-url";

/**
 * Exposes pathname to Server Components (e.g. SiteHeader) and enforces canonical production host.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();

  if (host === `www.${PRODUCTION_SITE_HOST}`) {
    const destination = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      PRODUCTION_SITE_URL
    );
    return NextResponse.redirect(destination, 308);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-rfts-pathname", request.nextUrl.pathname);
  return NextResponse.next({
    request: { headers: requestHeaders }
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|svg|gif|webp)$).*)"]
};
