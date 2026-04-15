import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Exposes pathname to Server Components (e.g. SiteHeader) so we can hide
 * "Members Console" on /member/login without client-only hacks or logout-on-mount.
 */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-rfts-pathname", request.nextUrl.pathname);
  return NextResponse.next({
    request: { headers: requestHeaders }
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|svg|gif|webp)$).*)"]
};
