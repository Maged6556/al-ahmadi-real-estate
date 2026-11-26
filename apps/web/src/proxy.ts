import { NextRequest, NextResponse } from "next/server";

const CSP_NONCE_HEADER = "x-csp-nonce";
const ACCESS_COOKIE = "access_token";

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString("base64");
}

function buildCspHeader(nonce: string): string {
  const scriptSources = ["'self'", `'nonce-${nonce}'`];
  const connectSources = ["'self'", "https:"];
  if (process.env.NODE_ENV === "development") {
    scriptSources.push("'unsafe-eval'");
    connectSources.push("http://localhost:*", "http://127.0.0.1:*");
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    `connect-src ${connectSources.join(" ")}`,
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join("; ");
}

function isAuthRoute(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/verify-email"
  );
}

function isProtectedRoute(pathname: string): boolean {
  return (
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname.startsWith("/admin")
  );
}

function localeFrom(pathname: string): string {
  const match = pathname.match(/^\/(ar|en)(\/|$)/);
  return match ? match[1] : "ar";
}

function stripLocale(pathname: string): string {
  return pathname.replace(/^\/(ar|en)/, "") || "/";
}

export function proxy(request: NextRequest) {
  const localeCookie = request.cookies.get("locale")?.value;
  const locale = localeCookie === "en" ? "en" : "ar";
  const nonce = generateNonce();
  const cspHeader = buildCspHeader(nonce);
  const pathname = request.nextUrl.pathname;
  const hasToken = request.cookies.has(ACCESS_COOKIE);
  const pathWithoutLocale = stripLocale(pathname);
  const pathLocale = localeFrom(pathname);

  if (
    pathname === "/" ||
    pathname === "/admin"
  ) {
    const destination =
      pathname === "/admin" ? `/${locale}/admin` : `/${locale}`;
    const response = NextResponse.redirect(new URL(destination, request.url));
    response.headers.set("Content-Security-Policy", cspHeader);
    return response;
  }

  // Route protection: redirect unauthenticated users from protected routes
  if (isProtectedRoute(pathWithoutLocale) && !hasToken) {
    const loginUrl = new URL(
      `/${pathLocale}/login?next=${encodeURIComponent(pathname)}`,
      request.url,
    );
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("Content-Security-Policy", cspHeader);
    return response;
  }

  // Redirect already-authenticated users from auth pages
  if (isAuthRoute(pathWithoutLocale) && hasToken) {
    const accountUrl = new URL(`/${pathLocale}/account`, request.url);
    const response = NextResponse.redirect(accountUrl);
    response.headers.set("Content-Security-Policy", cspHeader);
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CSP_NONCE_HEADER, nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
}

export const config = {
  matcher: ["/", "/admin", "/:locale/:path*"],
};
