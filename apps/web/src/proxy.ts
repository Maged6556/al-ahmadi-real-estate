import { NextRequest, NextResponse } from "next/server";

const CSP_NONCE_HEADER = "x-csp-nonce";

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

export function proxy(request: NextRequest) {
  const localeCookie = request.cookies.get("locale")?.value;
  const locale = localeCookie === "en" ? "en" : "ar";
  const nonce = generateNonce();
  const cspHeader = buildCspHeader(nonce);
  const pathname = request.nextUrl.pathname;

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
