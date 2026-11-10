import {
  ListingOffer,
  ListingStatus,
  ListingType,
  MediaKind,
  Prisma,
  UserRole,
} from "@prisma/client";
import { SignJWT } from "jose";
import { rateLimit } from "express-rate-limit";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import type { ApiEnv } from "../../config/env.js";
import type { AuthRepository, AuthUser } from "../auth/auth.repository.js";
import type { DashboardRepository } from "../admin/dashboard.repository.js";
import type {
  ListingRecord,
  ListingRepository,
} from "./listings.repository.js";

const secret = "test-secret-with-more-than-thirty-two-bytes";
const adminId = "00000000-0000-4000-8000-000000000001";
const userId = "00000000-0000-4000-8000-000000000002";
const editorId = "00000000-0000-4000-8000-000000000004";
const listingId = "00000000-0000-4000-8000-000000000003";

function user(id: string, role: UserRole): AuthUser {
  return {
    id,
    email: `${role.toLowerCase()}@example.test`,
    passwordHash: "unused",
    name: null,
    role,
    preferredLocale: "en",
    emailVerifiedAt: null,
    isActive: true,
    failedLoginCount: 0,
    lockedUntil: null,
  };
}

const adminUser = user(adminId, UserRole.ADMIN);
const regularUser = user(userId, UserRole.USER);
const editorUser = user(editorId, UserRole.EDITOR);

const listing: ListingRecord = {
  id: listingId,
  code: "AH-1001",
  slug: "apartment-riyadh",
  type: ListingType.APARTMENT,
  offer: ListingOffer.SALE,
  status: ListingStatus.AVAILABLE,
  titleAr: "شقة",
  titleEn: "Apartment",
  descriptionAr: "وصف",
  descriptionEn: "Description",
  city: "Riyadh",
  district: "North",
  addressText: "Private address",
  latitude: new Prisma.Decimal(24.7136),
  longitude: new Prisma.Decimal(46.6753),
  areaSqm: new Prisma.Decimal(120),
  bedrooms: 3,
  bathrooms: 2,
  floor: 4,
  features: [],
  isPublished: true,
  publishedAt: new Date("2026-01-01T00:00:00.000Z"),
  soldAt: null,
  rentedAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  media: [
    {
      id: "00000000-0000-4000-8000-000000000006",
      kind: MediaKind.IMAGE,
      url: "https://res.cloudinary.com/test/image.webp",
      width: 800,
      height: 600,
      sortOrder: 0,
      isCover: true,
      altAr: null,
      altEn: null,
    },
  ],
};

function testEnvironment(): ApiEnv {
  return {
    NODE_ENV: "test",
    API_PORT: 4000,
    DATABASE_URL: "postgresql://localhost:5432/test",
    DIRECT_URL: "postgresql://localhost:5432/test",
    REDIS_URL: "redis://localhost:6379",
    CORS_ORIGIN: "http://localhost:3000",
    JWT_ACCESS_SECRET: secret,
    WEB_REVALIDATION_URL: "http://localhost:3000/api/revalidate",
    WEB_REVALIDATION_SECRET: "test-revalidation-secret-with-more-than-32-bytes",
    WEB_BASE_URL: "http://localhost:3000",
    RESEND_API_KEY: undefined,
    EMAIL_FROM: undefined,
    MEDIA_MAX_IMAGE_BYTES: 10 * 1024 * 1024,
    MEDIA_MAX_IMAGE_PIXELS: 40_000_000,
    MEDIA_MAX_PER_LISTING: 20,
    ACCESS_TOKEN_TTL_SECONDS: 900,
    REFRESH_TOKEN_TTL_DAYS: 30,
    TRUST_PROXY_HOPS: 0,
  };
}

function testAuthRepository(): AuthRepository {
  const users = new Map([
    [adminUser.id, adminUser],
    [regularUser.id, regularUser],
    [editorUser.id, editorUser],
  ]);
  return {
    async findUserByEmail(email) {
      return (
        [...users.values()].find((candidate) => candidate.email === email) ??
        null
      );
    },
    async findUserById(id) {
      return users.get(id) ?? null;
    },
    async createUser() {
      throw new Error("User creation is not used in listing route tests.");
    },
    async recordFailedLogin() {
      return 0;
    },
    async resetFailedLogins() {},
    async createRefreshToken() {},
    async rotateRefreshToken() {
      return { status: "invalid" };
    },
    async revokeRefreshFamily() {},
  };
}

function testListingsRepository(): ListingRepository {
  return {
    async findPublicPage() {
      return [listing];
    },
    async countPublic() {
      return 1;
    },
    async countPublicByType() {
      return [{ type: ListingType.APARTMENT, count: 1 }];
    },
    async countPublicByOffer() {
      return [{ offer: ListingOffer.SALE, count: 1 }];
    },
    async findPublicBySlug(slug) {
      return slug === listing.slug ? listing : null;
    },
    async findPublicFilterOptions() {
      return [{ city: "Riyadh", district: "North" }];
    },
    async findAdminPage() {
      return [listing];
    },
    async countAdmin() {
      return 1;
    },
    async findAdminById(id) {
      return id === listingId ? listing : null;
    },
    async create() {
      return listing;
    },
    async update() {
      return listing;
    },
    async updateStatus() {
      return listing;
    },
    async setPublished() {
      return listing;
    },
    async softDelete() {
      return true;
    },
  };
}

async function tokenFor(id: string) {
  return new SignJWT({ tokenUse: "access" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(id)
    .setIssuer("al-ahmadi-api")
    .setAudience("al-ahmadi-web")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(secret));
}

function testRateLimiters() {
  const limiter = rateLimit({
    windowMs: 60_000,
    limit: 1_000,
    standardHeaders: false,
    legacyHeaders: false,
  });
  return { global: limiter, auth: limiter, login: limiter, register: limiter };
}

function createTestApp(dashboardRepository?: DashboardRepository) {
  return createApp(testEnvironment(), {
    authRepository: testAuthRepository(),
    listingsRepository: testListingsRepository(),
    dashboardRepository,
    rateLimiters: testRateLimiters(),
  });
}

describe("listing API routes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an explicit public DTO without internal identifiers, address, or price fields", async () => {
    const response = await request(createTestApp())
      .get("/api/listings/apartment-riyadh")
      .expect(200);

    expect(response.body.data).toMatchObject({
      code: "AH-1001",
      slug: "apartment-riyadh",
      type: "apartment",
      offer: "sale",
      status: "available",
      city: "Riyadh",
      district: "North",
    });
    expect(response.body.data).not.toHaveProperty("id");
    expect(response.body.data).not.toHaveProperty("addressText");
    expect(response.body.data.media[0]).not.toHaveProperty("id");
    expect(JSON.stringify(response.body)).not.toMatch(/price|currency/i);
  });

  it("rejects oversized pages and unknown public query parameters", async () => {
    await request(createTestApp()).get("/api/listings?limit=25").expect(400);
    await request(createTestApp()).get("/api/listings?price=100").expect(400);
  });

  it("enforces authentication and listing write permission on admin routes", async () => {
    const app = createTestApp();
    await request(app).get("/api/admin/listings").expect(401);
    await request(app)
      .get("/api/admin/listings")
      .set("Authorization", `Bearer ${await tokenFor(userId)}`)
      .expect(403);
    const response = await request(app)
      .get("/api/admin/listings")
      .set("Authorization", `Bearer ${await tokenFor(adminId)}`)
      .expect(200);
    expect(response.body.data[0]).toHaveProperty("id", listingId);
    expect(response.body.data[0].media[0]).toHaveProperty(
      "id",
      "00000000-0000-4000-8000-000000000006",
    );
    expect(JSON.stringify(response.body)).not.toMatch(/price|currency/i);
  });

  it("limits dashboard stats to staff and audit history to admins", async () => {
    const dashboardRepository: DashboardRepository = {
      async getStats() {
        return {
          listings: {
            total: 4,
            published: 3,
            byStatus: [{ value: ListingStatus.AVAILABLE, count: 4 }],
            byType: [{ value: ListingType.APARTMENT, count: 4 }],
          },
          inquiries: {
            total: 8,
            whatsappClicks: 6,
            byChannel: [{ value: "whatsapp_listing", count: 6 }],
          },
        };
      },
      async getAuditPage({ skip, take }) {
        return {
          data: [
            {
              id: "00000000-0000-4000-8000-000000000005",
              action: "LISTING_CREATED",
              entity: "listing",
              entityId: listingId,
              diff: { changedKeys: ["titleEn"] },
              createdAt: new Date("2026-01-01T00:00:00.000Z"),
              actor: {
                id: adminId,
                name: "Administrator",
                email: "admin@example.test",
              },
            },
          ].slice(skip, skip + take),
          total: 1,
        };
      },
    };
    const app = createTestApp(dashboardRepository);

    await request(app).get("/api/admin/stats").expect(401);
    const editorStats = await request(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${await tokenFor(editorId)}`)
      .expect(200);
    expect(editorStats.body.data.inquiries.whatsappClicks).toBe(6);

    await request(app)
      .get("/api/admin/audit")
      .set("Authorization", `Bearer ${await tokenFor(editorId)}`)
      .expect(403);
    const adminAudit = await request(app)
      .get("/api/admin/audit?limit=1")
      .set("Authorization", `Bearer ${await tokenFor(adminId)}`)
      .expect(200);
    expect(adminAudit.body.data[0].action).toBe("LISTING_CREATED");
    expect(adminAudit.body.meta).toMatchObject({
      page: 1,
      limit: 1,
      total: 1,
    });
  });

  it("allows editors to change listing status, audits through the repository, and requests cache revalidation", async () => {
    const updatedListing = {
      ...listing,
      status: ListingStatus.SOLD,
      soldAt: new Date("2026-02-01T00:00:00.000Z"),
    };
    const updateStatus = vi.fn(async () => updatedListing);
    const repository = {
      ...testListingsRepository(),
      updateStatus,
    } satisfies ListingRepository;
    const fetchCalls: { input: RequestInfo | URL; init?: RequestInit }[] = [];
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        fetchCalls.push({ input, init });
        return new Response(null, { status: 200 });
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    const app = createApp(testEnvironment(), {
      authRepository: testAuthRepository(),
      listingsRepository: repository,
      rateLimiters: testRateLimiters(),
    });

    const response = await request(app)
      .patch(`/api/admin/listings/${listingId}/status`)
      .set("Authorization", `Bearer ${await tokenFor(editorId)}`)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ status: "sold" })
      .expect(200);

    expect(updateStatus).toHaveBeenCalledOnce();
    expect(response.body.data.status).toBe("sold");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchCalls[0]?.input).toBe("http://localhost:3000/api/revalidate");
    expect(JSON.parse(String(fetchCalls[0]?.init?.body))).toEqual({
      tags: ["listings", `listing:${listing.slug}`],
    });
  });

  it("returns the committed listing update when public cache revalidation is unavailable", async () => {
    const updateStatus = vi.fn(async () => ({
      ...listing,
      status: ListingStatus.SOLD,
    }));
    const repository = {
      ...testListingsRepository(),
      updateStatus,
    } satisfies ListingRepository;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("Website unavailable");
      }),
    );
    const app = createApp(testEnvironment(), {
      authRepository: testAuthRepository(),
      listingsRepository: repository,
      rateLimiters: testRateLimiters(),
    });

    const response = await request(app)
      .patch(`/api/admin/listings/${listingId}/status`)
      .set("Authorization", `Bearer ${await tokenFor(editorId)}`)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ status: "sold" })
      .expect(200);

    expect(updateStatus).toHaveBeenCalledOnce();
    expect(response.body.data.status).toBe("sold");
  });

  it("keeps soft deletion restricted to admins", async () => {
    await request(createTestApp())
      .delete(`/api/admin/listings/${listingId}`)
      .set("Authorization", `Bearer ${await tokenFor(editorId)}`)
      .set("X-Requested-With", "XMLHttpRequest")
      .expect(403);
  });
});
