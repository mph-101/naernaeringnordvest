import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "./src/lib/supabase-next/middleware";

export async function middleware(request: NextRequest) {
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
