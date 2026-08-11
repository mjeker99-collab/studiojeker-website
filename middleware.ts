import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Tags responses with the active UI locale for root `html[lang]` and 404 chrome.
 * Does not rewrite URLs — DE/EN routing stays path-based.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const locale =
    pathname === "/en" || pathname.startsWith("/en/") ? "en" : "de";

  const response = NextResponse.next();
  response.headers.set("x-studiojeker-locale", locale);
  return response;
}

export const config = {
  matcher: [
    /*
     * Run on all page routes; skip Next internals and static assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|images/|videos/|robots.txt|sitemap.xml).*)",
  ],
};
