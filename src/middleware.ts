import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase-next/middleware";
import {
  PRELAUNCH_PAGE,
  PREVIEW_COOKIE,
  PREVIEW_COOKIE_MAX_AGE,
  PREVIEW_PARAM,
  prelaunchDecision,
} from "./lib/prelaunch";

const NOINDEX = "noindex, nofollow";

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Førlanseringssperre: styres av PRELAUNCH i Vercel. Av = uendret oppførsel.
  const decision = prelaunchDecision({
    enabled: process.env.PRELAUNCH,
    previewToken: process.env.PRELAUNCH_PREVIEW_TOKEN,
    pathname,
    previewParam: searchParams.get(PREVIEW_PARAM),
    previewCookie: request.cookies.get(PREVIEW_COOKIE)?.value,
  });

  if (decision.type === "grant") {
    // Strip the token from the URL so it does not end up in history or shares.
    const url = request.nextUrl.clone();
    url.searchParams.delete(PREVIEW_PARAM);
    const response = NextResponse.redirect(url);
    response.cookies.set(PREVIEW_COOKIE, process.env.PRELAUNCH_PREVIEW_TOKEN!.trim(), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: PREVIEW_COOKIE_MAX_AGE,
    });
    response.headers.set("X-Robots-Tag", NOINDEX);
    return response;
  }

  if (decision.type === "gate") {
    const url = request.nextUrl.clone();
    url.pathname = PRELAUNCH_PAGE;
    url.search = "";
    const response = NextResponse.rewrite(url);
    response.headers.set("X-Robots-Tag", NOINDEX);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const response = await handleRequest(request);
  // While the gate is on, nothing on this deployment should be indexed —
  // including pages reached through the preview cookie.
  if (decision.type === "pass") response.headers.set("X-Robots-Tag", NOINDEX);
  return response;
}

async function handleRequest(request: NextRequest) {
  // Rewrite /@username -> /journalist/username so the public-facing URL
  // is Twitter-style while the internal route lives under /journalist/.
  const { pathname } = request.nextUrl;
  const atMatch = pathname.match(/^\/@([A-Za-z0-9_-]+)\/?$/);
  if (atMatch) {
    const username = atMatch[1].toLowerCase();
    const url = request.nextUrl.clone();
    url.pathname = `/journalist/${username}`;
    return NextResponse.rewrite(url);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
