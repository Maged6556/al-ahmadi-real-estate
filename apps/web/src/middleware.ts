import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

const CSP_NONCE_HEADER = "x-csp-nonce";

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString("base64");
}

function buildCspHeader(nonce: string): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'nonce-" + nonce + "'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join("; ");
}

export function middleware(request: NextRequest) {
  const localeCookie = request.cookies.get("locale")?.value;
  const locale = localeCookie === "en" ? "en" : "ar";

  const nonce = generateNonce();
  const cspHeader = buildCspHeader(nonce);

  // Handle root and /admin redirects
  if (
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname === "/admin"
  ) {
    const destination =
      request.nextUrl.pathname === "/admin" ? `/${locale}/admin` : `/${locale}`;
    const response = NextResponse.redirect(new URL(destination, request.url));
    response.headers.set(CSP_NONCE_HEADER, nonce);
    response.headers.set("Content-Security-Policy", cspHeader);
    return response;
  }

  // For all other requests, add CSP header to response
  const response = NextResponse.next();
  response.headers.set(CSP_NONCE_HEADER, nonce);
  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
}

export async function getCspNonce(): Promise<string> {
  const headersList = await headers();
  return headersList.get(CSP_NONCE_HEADER) ?? generateNonce();
}

export const config = {
  matcher: ["/", "/admin", "/:locale/:path*"],
};
