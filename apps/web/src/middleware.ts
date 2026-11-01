import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const localeCookie = request.cookies.get("locale")?.value;
  const locale = localeCookie === "en" ? "en" : "ar";
  const destination =
    request.nextUrl.pathname === "/admin" ? `/${locale}/admin` : `/${locale}`;
  return NextResponse.redirect(new URL(destination, request.url));
}

export const config = {
  matcher: ["/", "/admin"],
};
