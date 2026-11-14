import { describe, expect, it } from "vitest";
import request from "supertest";
import { rateLimit } from "express-rate-limit";
import { createApp } from "../../apps/api/src/app.js";
import type { ApiEnv } from "../../apps/api/src/config/env.js";

function getSecurityEnv(): ApiEnv {
  return {
    NODE_ENV: "production", // Test production security posture
    API_PORT: 4000,
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    DIRECT_URL: "postgresql://test:test@localhost:5432/test",
    REDIS_URL: "redis://localhost:6379",
    CORS_ORIGIN: "http://localhost:3000",
    JWT_ACCESS_SECRET: "test-secret-with-more-than-thirty-two-bytes",
    WEB_REVALIDATION_URL: "http://localhost:3000/api/revalidate",
    WEB_REVALIDATION_SECRET: "test-revalidation-secret-with-more-than-32-bytes",
    WEB_BASE_URL: "http://localhost:3000",
    RESEND_API_KEY: undefined,
    EMAIL_FROM: "Al-ahmadi <no-reply@example.com>",
    MEDIA_MAX_IMAGE_BYTES: 10 * 1024 * 1024,
    MEDIA_MAX_IMAGE_PIXELS: 40_000_000,
    MEDIA_MAX_PER_LISTING: 20,
    ACCESS_TOKEN_TTL_SECONDS: 900,
    REFRESH_TOKEN_TTL_DAYS: 30,
    TRUST_PROXY_HOPS: 0,
  };
}

describe("Non-Functional Testing: Security & Vulnerability Auditing", () => {
  const app = createApp(getSecurityEnv(), {
    rateLimiters: {
      global: rateLimit({ windowMs: 60000, limit: 1000 }),
      auth: rateLimit({ windowMs: 60000, limit: 1000 }),
      login: rateLimit({ windowMs: 60000, limit: 1000 }),
      register: rateLimit({ windowMs: 60000, limit: 1000 }),
    },
    listingsRepository: {
      findPublicPage: async () => ({ items: [], total: 0 }),
      findPublicBySlug: async () => null,
      findPublicMetadata: async () => ({
        cities: [],
        types: [],
        offers: [],
        statuses: [],
      }),
      findAdminPage: async () => ({ items: [], total: 0 }),
      findAdminById: async () => null,
      create: async () => ({} as any),
      update: async () => ({} as any),
      delete: async () => ({} as any),
    },
  });

  describe("OWASP A03: Injection Resilience (SQLi / NoSQLi)", () => {
    it("safely rejects SQL injection attempts in query parameters with 400 Bad Request", async () => {
      const payloads = [
        "' OR '1'='1",
        "1; DROP TABLE listings; --",
        "UNION SELECT null, username, password FROM users --",
      ];

      for (const payload of payloads) {
        const res = await request(app)
          .get("/api/listings")
          .query({ type: payload });

        // Zod validation rejects invalid enum payload safely before hitting database
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
      }
    });

    it("rejects malicious pagination parameters designed to cause buffer overflow or denial of service", async () => {
      const res = await request(app)
        .get("/api/listings")
        .query({ page: -999999, limit: 99999999 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("OWASP A01: Broken Access Control & CSRF Protection", () => {
    it("rejects POST/PUT/DELETE requests lacking CSRF proof", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "test@example.com", password: "some-password" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("CSRF_REJECTED");
    });

    it("blocks cross-origin request attempts from unauthorized external origins", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .set("Origin", "https://evil-phishing-site.com")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ email: "test@example.com", password: "some-password" });

      expect(res.status).toBe(403);
    });
  });

  describe("OWASP A05: Security Misconfiguration & Hardening Headers", () => {
    it("enforces Strict-Transport-Security (HSTS) in production environment", async () => {
      const res = await request(app).get("/healthz");
      expect(res.headers["strict-transport-security"]).toBeDefined();
      expect(res.headers["strict-transport-security"]).toContain("max-age=");
    });

    it("enforces frame-ancestors none and X-Frame-Options DENY against clickjacking", async () => {
      const res = await request(app).get("/healthz");
      expect(res.headers["x-frame-options"]).toBe("DENY");
      expect(res.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    });

    it("sets X-Content-Type-Options: nosniff to prevent MIME type confusion attacks", async () => {
      const res = await request(app).get("/healthz");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
    });
  });

  describe("OWASP A02: Cryptographic Failures & Sensitive Data Leakage", () => {
    it("guarantees error responses never expose internal stack traces or database info", async () => {
      const res = await request(app).get("/api/non-existent-route");
      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();

      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain("node_modules");
      expect(bodyStr).not.toContain("prisma");
      expect(bodyStr).not.toContain("passwordHash");
      expect(bodyStr).not.toContain("DATABASE_URL");
    });
  });
});

