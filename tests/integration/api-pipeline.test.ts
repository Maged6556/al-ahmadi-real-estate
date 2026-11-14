import { describe, expect, it } from "vitest";
import request from "supertest";
import { rateLimit } from "express-rate-limit";
import { createApp } from "../../apps/api/src/app.js";
import type { ApiEnv } from "../../apps/api/src/config/env.js";
import type { ApiRateLimiters } from "../../apps/api/src/middleware/rate-limit.js";

function getTestEnv(): ApiEnv {
  return {
    NODE_ENV: "test",
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

function getTestLimiters(): ApiRateLimiters {
  const limiter = rateLimit({
    windowMs: 60_000,
    limit: 100,
    standardHeaders: false,
    legacyHeaders: false,
  });

  return {
    global: limiter,
    auth: limiter,
    login: limiter,
    register: limiter,
  };
}

describe("API Pipeline & Middleware Integration Testing", () => {
  const app = createApp(getTestEnv(), {
    rateLimiters: getTestLimiters(),
  });

  describe("Request ID Propagation", () => {
    it("generates and attaches x-request-id when missing in incoming request", async () => {
      const response = await request(app).get("/healthz");
      expect(response.status).toBe(200);
      expect(response.headers["x-request-id"]).toBeDefined();
      expect(response.headers["x-request-id"].length).toBeGreaterThan(10);
    });

    it("respects and forwards an existing x-request-id for end-to-end tracing", async () => {
      const customId = "trace-client-123456789";
      const response = await request(app)
        .get("/healthz")
        .set("X-Request-Id", customId);
      expect(response.status).toBe(200);
      expect(response.headers["x-request-id"]).toBe(customId);
    });
  });

  describe("Security Headers Integration", () => {
    it("enforces comprehensive defense-in-depth headers on all responses", async () => {
      const response = await request(app).get("/healthz");
      expect(response.headers["x-content-type-options"]).toBe("nosniff");
      expect(response.headers["content-security-policy"]).toContain(
        "frame-ancestors 'none'",
      );
      expect(response.headers["permissions-policy"]).toContain("camera=()");
      expect(response.headers["x-frame-options"]).toBe("DENY");
    });
  });

  describe("CORS Boundary Integration", () => {
    it("allows configured origin and reflects CORS headers", async () => {
      const response = await request(app)
        .get("/healthz")
        .set("Origin", "http://localhost:3000");

      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:3000",
      );
      expect(response.headers["access-control-allow-credentials"]).toBe("true");
    });

    it("rejects untrusted third-party origins on preflight OPTIONS", async () => {
      const response = await request(app)
        .options("/api/listings")
        .set("Origin", "https://malicious-site.example")
        .set("Access-Control-Request-Method", "GET");

      expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    });
  });

  describe("CSRF Protection Middleware Integration", () => {
    it("blocks mutating requests missing X-Requested-With or origin", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "any@example.com",
        password: "any-password",
      });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("CSRF_REJECTED");
      expect(response.body.error.requestId).toBeDefined();
    });

    it("permits mutating request when valid CSRF headers are provided", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .set("Origin", "http://localhost:3000")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          email: "nonexistent@example.com",
          password: "wrong-password",
        });

      // It passes the CSRF check and reaches authentication validation (401 invalid credentials)
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
    });
  });

  describe("Global Error Handler Integration", () => {
    it("formats 404 Not Found into standardized API error structure", async () => {
      const response = await request(app).get("/api/unknown-endpoint");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toMatchObject({
        code: "NOT_FOUND",
        message: expect.any(String),
        requestId: expect.any(String),
      });
    });
  });
});

