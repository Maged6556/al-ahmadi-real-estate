import { SignJWT } from "jose";
import { rateLimit } from "express-rate-limit";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../apps/api/src/app.js";
import type { ApiEnv } from "../../apps/api/src/config/env.js";
import type {
  AuthRepository,
  AuthUser,
} from "../../apps/api/src/modules/auth/auth.repository.js";
import type { DashboardRepository } from "../../apps/api/src/modules/admin/dashboard.repository.js";
import type {
  ListingRecord,
  ListingRepository,
} from "../../apps/api/src/modules/listings/listings.repository.js";

const secret = "test-secret-with-more-than-thirty-two-bytes";
const adminId = "00000000-0000-4000-8000-000000000001";
const userId = "00000000-0000-4000-8000-000000000002";
const sampleListingId = "00000000-0000-4000-8000-000000000003";
const ADMIN_ROLE = "ADMIN" as AuthUser["role"];
const USER_ROLE = "USER" as AuthUser["role"];
const LISTING_TYPE_VILLA = "VILLA" as ListingRecord["type"];
const LISTING_OFFER_SALE = "SALE" as ListingRecord["offer"];
const LISTING_STATUS_AVAILABLE = "AVAILABLE" as ListingRecord["status"];
const decimal = (value: number) =>
  ({ toNumber: () => value }) as unknown as NonNullable<
    ListingRecord["areaSqm"]
  >;

function testEnv(): ApiEnv {
  return {
    NODE_ENV: "test",
    API_PORT: 4000,
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    DIRECT_URL: "postgresql://test:test@localhost:5432/test",
    REDIS_URL: "redis://localhost:6379",
    CORS_ORIGIN: "http://localhost:3000",
    JWT_ACCESS_SECRET: secret,
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

async function signJwt(user: AuthUser) {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    locale: user.preferredLocale,
    tokenUse: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("al-ahmadi-api")
    .setAudience("al-ahmadi-web")
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(new TextEncoder().encode(secret));
}

const sampleListing = {
  id: sampleListingId,
  code: "AH-2026",
  slug: "luxury-villa-cairo",
  type: LISTING_TYPE_VILLA,
  offer: LISTING_OFFER_SALE,
  status: LISTING_STATUS_AVAILABLE,
  titleAr: "فيلا فاخرة للتملك",
  titleEn: "Luxury Villa for Sale",
  descriptionAr: "فيلا بتشطيب ملكي راقي",
  descriptionEn: "Villa with luxury finishings",
  city: "Cairo",
  district: "New Cairo",
  addressText: "Confidential private address",
  latitude: decimal(30.0444),
  longitude: decimal(31.2357),
  areaSqm: decimal(450),
  bedrooms: 5,
  bathrooms: 4,
  floor: null,
  features: ["Garden", "Swimming Pool", "Garage"],
  isPublished: true,
  publishedAt: new Date("2026-02-01T00:00:00.000Z"),
  soldAt: null,
  rentedAt: null,
  createdAt: new Date("2026-02-01T00:00:00.000Z"),
  updatedAt: new Date("2026-02-01T00:00:00.000Z"),
  media: [],
} as unknown as ListingRecord;

describe("System Testing (End-to-End System Journey)", () => {
  const users = new Map<string, AuthUser>([
    [
      adminId,
      {
        id: adminId,
        email: "admin@al-ahmadi.com",
        passwordHash: "hash",
        name: "Admin Manager",
        role: ADMIN_ROLE,
        preferredLocale: "ar",
        emailVerifiedAt: new Date(),
        isActive: true,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    ],
    [
      userId,
      {
        id: userId,
        email: "client@example.com",
        passwordHash: "hash",
        name: "Client User",
        role: USER_ROLE,
        preferredLocale: "ar",
        emailVerifiedAt: new Date(),
        isActive: true,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    ],
  ]);

  const authRepo: AuthRepository = {
    async findUserById(id) {
      return users.get(id) ?? null;
    },
    async findUserByEmail(email) {
      for (const u of users.values()) {
        if (u.email.toLowerCase() === email.toLowerCase()) return u;
      }
      return null;
    },
    async createUser(data) {
      const newUser: AuthUser = {
        id: "new-user-id",
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name ?? null,
        role: data.role,
        preferredLocale: data.preferredLocale,
        emailVerifiedAt: null,
        isActive: true,
        failedLoginCount: 0,
        lockedUntil: null,
      };
      users.set(newUser.id, newUser);
      return newUser;
    },
    async updateUser(id, patch) {
      const existing = users.get(id);
      if (!existing) throw new Error("Not found");
      const updated = { ...existing, ...patch };
      users.set(id, updated);
      return updated;
    },
    async storeRefreshToken() {},
    async rotateRefreshToken() {
      throw new Error("Unused in this scenario");
    },
    async revokeSession() {},
    async revokeUserSessions() {},
  };

  const listings: ListingRecord[] = [sampleListing];

  const listingsRepo: ListingRepository = {
    async findPublicPage({ where, skip, take }) {
      const filtered = listings.filter((l) => {
        if (where.isPublished && !l.isPublished) return false;
        if (where.city && l.city !== where.city) return false;
        if (where.type && l.type !== where.type) return false;
        if (where.offer && l.offer !== where.offer) return false;
        return true;
      });
      return filtered.slice(skip, skip + take);
    },
    async countPublic() {
      return listings.length;
    },
    async countPublicByType() {
      return [{ type: LISTING_TYPE_VILLA, count: 1 }];
    },
    async countPublicByOffer() {
      return [{ offer: LISTING_OFFER_SALE, count: 1 }];
    },
    async findPublicBySlug(slug) {
      return listings.find((l) => l.slug === slug && l.isPublished) ?? null;
    },
    async findPublicFilterOptions() {
      return [{ city: "Cairo", district: "New Cairo" }];
    },
    async findAdminPage() {
      return listings;
    },
    async countAdmin() {
      return listings.length;
    },
    async findAdminById(id) {
      return listings.find((l) => l.id === id) ?? null;
    },
    async create(data) {
      const created = {
        ...sampleListing,
        id: "created-id",
        ...data,
      } as ListingRecord;
      listings.push(created);
      return created;
    },
    async update(id, data) {
      const idx = listings.findIndex((l) => l.id === id);
      if (idx === -1) throw new Error("Not found");
      const updated = { ...listings[idx], ...data } as ListingRecord;
      listings[idx] = updated;
      return updated;
    },
    async delete(id) {
      const idx = listings.findIndex((l) => l.id === id);
      if (idx === -1) throw new Error("Not found");
      const [removed] = listings.splice(idx, 1);
      return removed;
    },
  };

  const dashboardRepo: DashboardRepository = {
    async getStats() {
      return {
        listings: {
          total: listings.length,
          published: listings.filter((l) => l.isPublished).length,
          byStatus: [{ value: LISTING_STATUS_AVAILABLE, count: 1 }],
          byType: [{ value: LISTING_TYPE_VILLA, count: 1 }],
        },
        inquiries: {
          total: 5,
          whatsappClicks: 3,
          byChannel: [{ value: "whatsapp", count: 3 }],
        },
      };
    },
    async getAuditPage() {
      return { data: [], total: 0 };
    },
  };

  const app = createApp(testEnv(), {
    authRepository: authRepo,
    listingsRepository: listingsRepo,
    dashboardRepository: dashboardRepo,
    rateLimiters: {
      global: rateLimit({ windowMs: 60000, limit: 1000 }),
      auth: rateLimit({ windowMs: 60000, limit: 1000 }),
      login: rateLimit({ windowMs: 60000, limit: 1000 }),
      register: rateLimit({ windowMs: 60000, limit: 1000 }),
    },
  });

  it("Stage 1: Visitor browses filter options and gets search facets", async () => {
    const metaResponse = await request(app).get("/api/meta/filters");
    expect(metaResponse.status).toBe(200);
    expect(metaResponse.body.data.cities).toContain("Cairo");
    expect(metaResponse.body.data.types).toContain("villa");
  });

  it("Stage 2: Visitor queries listings with filters and receives sanitized DTO", async () => {
    const listingsResponse = await request(app)
      .get("/api/listings")
      .query({ city: "Cairo", type: "villa", offer: "sale" });

    expect(listingsResponse.status).toBe(200);
    expect(listingsResponse.body.data).toHaveLength(1);
    const item = listingsResponse.body.data[0];
    expect(item.code).toBe("AH-2026");
    expect(item.titleAr).toBe("فيلا فاخرة للتملك");
    // Verify privacy & security: no private address or price fields in public list
    expect(item).not.toHaveProperty("addressText");
    expect(item).not.toHaveProperty("price");
  });

  it("Stage 3: Visitor opens single listing by slug", async () => {
    const detailResponse = await request(app).get(
      "/api/listings/luxury-villa-cairo",
    );
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.code).toBe("AH-2026");
    expect(detailResponse.body.data.city).toBe("Cairo");
    expect(detailResponse.body.data).not.toHaveProperty("addressText");
  });

  it("Stage 4: Normal user cannot access Admin Dashboard (RBAC barrier)", async () => {
    const regularToken = await signJwt(users.get(userId)!);
    const response = await request(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${regularToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("Stage 5: Admin authenticates and accesses Dashboard and Admin Listings", async () => {
    const adminToken = await signJwt(users.get(adminId)!);

    // 1. Dashboard summary stats
    const dashResponse = await request(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(dashResponse.status).toBe(200);
    expect(dashResponse.body.data.listings.total).toBeGreaterThanOrEqual(1);

    // 2. Admin Listings view (shows code and internal details)
    const adminListingsResponse = await request(app)
      .get("/api/admin/listings")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminListingsResponse.status).toBe(200);
    expect(adminListingsResponse.body.data[0].code).toBe("AH-2026");
  });
});
