import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { canonicalHostRedirectUrl } from "@/lib/site-url";

/**
 * Exposes pathname to Server Components (e.g. SiteHeader) and enforces canonical production host.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  const canonical = canonicalHostRedirectUrl(
    host,
    request.nextUrl.pathname,
    request.nextUrl.search
  );
  if (canonical) {
    return NextResponse.redirect(canonical, 308);
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
