import { describe, expect, it } from "vitest";
import request from "supertest";
import { rateLimit } from "express-rate-limit";
import { createApp } from "../../apps/api/src/app.js";
import type { ApiEnv } from "../../apps/api/src/config/env.js";

function getPerfEnv(): ApiEnv {
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

describe("Non-Functional Testing: Performance & Load Testing", () => {
  const app = createApp(getPerfEnv(), {
    rateLimiters: {
      global: rateLimit({ windowMs: 60000, limit: 10000 }),
      auth: rateLimit({ windowMs: 60000, limit: 10000 }),
      login: rateLimit({ windowMs: 60000, limit: 10000 }),
      register: rateLimit({ windowMs: 60000, limit: 10000 }),
    },
    listingsRepository: {
      findPublicPage: async () => [],
      countPublic: async () => 0,
      countPublicByType: async () => [],
      countPublicByOffer: async () => [],
      findPublicBySlug: async () => null,
      findPublicFilterOptions: async () => [
        { city: "Cairo", district: "New Cairo" },
        { city: "Alexandria", district: null },
      ],
      findAdminPage: async () => [],
      countAdmin: async () => 0,
      findAdminById: async () => null,
      create: async () => ({}) as never,
      update: async () => ({}) as never,
      delete: async () => ({}) as never,
    },
  });

  it("handles 50 concurrent requests with zero errors and low latency", async () => {
    const concurrentRequests = 50;

    // Warm the request path so module initialization and one-time middleware
    // setup do not distort the throughput measurement.
    const warmup = await request(app).get("/api/meta/filters");
    expect(warmup.status).toBe(200);

    const start = performance.now();

    const promises = Array.from({ length: concurrentRequests }, () =>
      request(app).get("/api/meta/filters"),
    );

    const responses = await Promise.all(promises);
    const durationMs = performance.now() - start;

    // 1. Success rate check
    const successful = responses.filter((r) => r.status === 200);
    expect(successful.length).toBe(concurrentRequests);

    // 2. Throughput calculation
    const rps = (concurrentRequests / durationMs) * 1000;
    expect(rps).toBeGreaterThan(100); // Expect at least 100 req/sec in memory test

    // 3. Average latency per request
    const avgLatency = durationMs / concurrentRequests;
    expect(avgLatency).toBeLessThan(50); // Under 50ms average
  });

  it("ensures public metadata payload size is lightweight (< 5 KB)", async () => {
    const response = await request(app).get("/api/meta/filters");
    expect(response.status).toBe(200);

    const payloadString = JSON.stringify(response.body);
    const payloadBytes = Buffer.byteLength(payloadString, "utf8");

    expect(payloadBytes).toBeLessThan(5 * 1024); // Under 5 KB
  });

  it("sets appropriate Cache-Control directives for performance", async () => {
    // Healthz response
    const health = await request(app).get("/healthz");
    expect(health.status).toBe(200);

    // Mutating endpoints must forbid caching
    const csrfFail = await request(app).post("/api/auth/login").send({});
    expect(csrfFail.headers["cache-control"]).toBe("no-store");
  });
});
