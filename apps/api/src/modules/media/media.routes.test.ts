import { MediaKind, UserRole } from "@prisma/client";
import { SignJWT } from "jose";
import sharp from "sharp";
import { rateLimit } from "express-rate-limit";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import type { ApiEnv } from "../../config/env.js";
import type { AuthRepository, AuthUser } from "../auth/auth.repository.js";
import type { MediaRecord, MediaRepository } from "./media.repository.js";
import type { StorageProvider } from "./storage-provider.js";
import { MAX_IMAGE_BYTES } from "./media.service.js";

const secret = "test-secret-with-more-than-thirty-two-bytes";
const adminId = "00000000-0000-4000-8000-000000000001";
const editorId = "00000000-0000-4000-8000-000000000002";
const listingId = "00000000-0000-4000-8000-000000000003";
const listingSlug = "riyadh-apartment";
const secondAdminId = "00000000-0000-4000-8000-000000000005";

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

const admin = user(adminId, UserRole.ADMIN);
const editor = user(editorId, UserRole.EDITOR);
const secondAdmin = user(secondAdminId, UserRole.ADMIN);

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
    [admin.id, admin],
    [editor.id, editor],
    [secondAdmin.id, secondAdmin],
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
      throw new Error("User creation is not used in media route tests.");
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

function createMediaRepository() {
  const grants = new Map<
    string,
    {
      listingId: string;
      actorId: string;
      mimeType: string;
      expiresAt: Date;
      consumed: boolean;
    }
  >();
  const media = new Map<string, MediaRecord>();
  const repository: MediaRepository = {
    async findActiveListing(id) {
      return id === listingId
        ? {
            id,
            slug: listingSlug,
            mediaCount: [...media.values()].filter(
              (item) => item.listingId === id,
            ).length,
          }
        : null;
    },
    async createUploadGrant(input) {
      grants.set(input.tokenHash, { ...input, consumed: false });
    },
    async consumeUploadGrant(input) {
      const grant = grants.get(input.tokenHash);
      if (
        !grant ||
        grant.actorId !== input.actorId ||
        grant.mimeType !== input.mimeType ||
        grant.expiresAt <= input.now ||
        grant.consumed
      ) {
        return null;
      }
      grant.consumed = true;
      return {
        id: "00000000-0000-4000-8000-000000000004",
        listingId: grant.listingId,
        listingSlug,
      };
    },
    async createImage(input) {
      const item: MediaRecord = {
        id: crypto.randomUUID(),
        listingId: input.listingId,
        kind: MediaKind.IMAGE,
        url: input.url,
        publicId: input.publicId,
        width: input.width,
        height: input.height,
        sortOrder: [...media.values()].length,
        isCover: media.size === 0,
        altAr: null,
        altEn: null,
        createdAt: new Date(),
      };
      media.set(item.id, item);
      return item;
    },
    async createVideoLink(input) {
      const item: MediaRecord = {
        id: crypto.randomUUID(),
        listingId: input.listingId,
        kind: MediaKind.VIDEO,
        url: input.url,
        publicId: `external-video:${crypto.randomUUID()}`,
        width: null,
        height: null,
        sortOrder: [...media.values()].length,
        isCover: false,
        altAr: null,
        altEn: null,
        createdAt: new Date(),
      };
      media.set(item.id, item);
      return item;
    },
    async findMediaById(id) {
      const item = media.get(id);
      return item ? { ...item, listing: { slug: listingSlug } } : null;
    },
    async deleteMedia(id) {
      return media.delete(id);
    },
    async reorderMedia(input) {
      const items = input.media.map((item) => media.get(item.id));
      if (items.some((item) => !item)) return null;
      for (const order of input.media) {
        const existing = media.get(order.id);
        if (!existing || existing.listingId !== input.listingId) return null;
        media.set(order.id, {
          ...existing,
          sortOrder: order.sortOrder,
          isCover: order.isCover,
        });
      }
      return [...media.values()].sort(
        (left, right) => left.sortOrder - right.sortOrder,
      );
    },
  };

  return { repository, media };
}

function createStorage() {
  const stored = new Map<string, Buffer>();
  const storage: StorageProvider = {
    async uploadImage(input) {
      stored.set(input.publicId, input.buffer);
      return {
        publicId: input.publicId,
        url: `https://res.cloudinary.com/test/image/upload/${input.publicId}.webp`,
        width: 1,
        height: 1,
      };
    },
    async deleteImage(publicId) {
      stored.delete(publicId);
    },
  };
  return { storage, stored };
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

function createTestApp(
  mediaRepository: MediaRepository,
  storage: StorageProvider,
) {
  return createApp(testEnvironment(), {
    authRepository: testAuthRepository(),
    mediaRepository,
    mediaStorage: storage,
    rateLimiters: testRateLimiters(),
  });
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

async function signGrant(
  app: ReturnType<typeof createTestApp>,
  contentType = "image/png",
) {
  return request(app)
    .post("/api/admin/media/sign")
    .set("Authorization", `Bearer ${await tokenFor(adminId)}`)
    .set("X-Requested-With", "XMLHttpRequest")
    .send({ listingId, contentType })
    .expect(201);
}

async function validPng() {
  return sharp({
    create: {
      width: 1,
      height: 1,
      channels: 3,
      background: { r: 220, g: 120, b: 80 },
    },
  })
    .png()
    .toBuffer();
}

describe("media upload API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses a single-use grant, validates the bytes, and strips image metadata before storage", async () => {
    const { repository, media } = createMediaRepository();
    const { storage, stored } = createStorage();
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const app = createTestApp(repository, storage);
    const signed = await signGrant(app, "image/jpeg");
    const imageWithMetadata = await sharp(await validPng())
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const uploaded = await request(app)
      .post(signed.body.data.uploadUrl)
      .set("Authorization", `Bearer ${await tokenFor(adminId)}`)
      .set("X-Requested-With", "XMLHttpRequest")
      .set("X-Upload-Token", signed.body.data.uploadToken)
      .set("X-Upload-Content-Type", "image/jpeg")
      .set("Content-Type", "application/octet-stream")
      .send(imageWithMetadata)
      .expect(201);

    expect(uploaded.body.data.kind).toBe("IMAGE");
    expect(uploaded.body.data.isCover).toBe(true);
    expect(uploaded.body.data.url).toContain("res.cloudinary.com");
    const storedImage = stored.get(uploaded.body.data.publicId);
    expect(storedImage).toBeDefined();
    const metadata = await sharp(storedImage).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.exif).toBeUndefined();
    expect(media.size).toBe(1);
    expect(fetchMock).toHaveBeenCalledOnce();

    await request(app)
      .post(signed.body.data.uploadUrl)
      .set("Authorization", `Bearer ${await tokenFor(adminId)}`)
      .set("X-Requested-With", "XMLHttpRequest")
      .set("X-Upload-Token", signed.body.data.uploadToken)
      .set("X-Upload-Content-Type", "image/jpeg")
      .set("Content-Type", "application/octet-stream")
      .send(imageWithMetadata)
      .expect(401);
  });

  it("rejects mismatched and spoofed MIME types before calling storage", async () => {
    const { repository } = createMediaRepository();
    const { storage, stored } = createStorage();
    const app = createTestApp(repository, storage);
    const signed = await signGrant(app);

    await request(app)
      .post(signed.body.data.uploadUrl)
      .set("Authorization", `Bearer ${await tokenFor(adminId)}`)
      .set("X-Requested-With", "XMLHttpRequest")
      .set("X-Upload-Token", signed.body.data.uploadToken)
      .set("X-Upload-Content-Type", "image/png")
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.from("not an image"))
      .expect(400);

    expect(stored.size).toBe(0);
  });

  it("binds grants to the issuing administrator and listing", async () => {
    const { repository } = createMediaRepository();
    const { storage, stored } = createStorage();
    const app = createTestApp(repository, storage);
    const signed = await signGrant(app);

    await request(app)
      .post(signed.body.data.uploadUrl)
      .set("Authorization", `Bearer ${await tokenFor(secondAdminId)}`)
      .set("X-Requested-With", "XMLHttpRequest")
      .set("X-Upload-Token", signed.body.data.uploadToken)
      .set("X-Upload-Content-Type", "image/png")
      .set("Content-Type", "application/octet-stream")
      .send(await validPng())
      .expect(401);

    expect(stored.size).toBe(0);
  });

  it("enforces upload size and admin-only grants", async () => {
    const { repository } = createMediaRepository();
    const { storage } = createStorage();
    const app = createTestApp(repository, storage);

    await request(app)
      .post("/api/admin/media/sign")
      .set("Authorization", `Bearer ${await tokenFor(editorId)}`)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ listingId, contentType: "image/png" })
      .expect(403);

    const signed = await signGrant(app);
    await request(app)
      .post(signed.body.data.uploadUrl)
      .set("Authorization", `Bearer ${await tokenFor(adminId)}`)
      .set("X-Requested-With", "XMLHttpRequest")
      .set("X-Upload-Token", signed.body.data.uploadToken)
      .set("X-Upload-Content-Type", "image/png")
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.alloc(MAX_IMAGE_BYTES + 1))
      .expect(413);
  });

  it("allows administrators to link safe direct video files and delete the link", async () => {
    const { repository, media } = createMediaRepository();
    const { storage, stored } = createStorage();
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const app = createTestApp(repository, storage);

    await request(app)
      .post("/api/admin/media/video-link")
      .set("Authorization", `Bearer ${await tokenFor(editorId)}`)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ listingId, url: "https://cdn.example.test/tour.mp4" })
      .expect(403);

    const linked = await request(app)
      .post("/api/admin/media/video-link")
      .set("Authorization", `Bearer ${await tokenFor(adminId)}`)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ listingId, url: "https://cdn.example.test/tour.mp4" })
      .expect(201);
    expect(linked.body.data.kind).toBe("VIDEO");
    expect(linked.body.data.isCover).toBe(false);

    await request(app)
      .post("/api/admin/media/video-link")
      .set("Authorization", `Bearer ${await tokenFor(adminId)}`)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ listingId, url: "javascript:alert(1)" })
      .expect(400);

    await request(app)
      .delete(`/api/admin/media/${linked.body.data.id}`)
      .set("Authorization", `Bearer ${await tokenFor(adminId)}`)
      .set("X-Requested-With", "XMLHttpRequest")
      .expect(200);
    expect(media.size).toBe(0);
    expect(stored.size).toBe(0);
  });

  it("allows the signed upload headers in browser CORS preflights", async () => {
    const { repository } = createMediaRepository();
    const { storage } = createStorage();
    const response = await request(createTestApp(repository, storage))
      .options("/api/admin/media")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "POST")
      .set(
        "Access-Control-Request-Headers",
        "content-type,x-requested-with,x-upload-token,x-upload-content-type",
      )
      .expect(204);

    expect(response.headers["access-control-allow-headers"]).toContain(
      "X-Upload-Token",
    );
    expect(response.headers["access-control-allow-headers"]).toContain(
      "X-Upload-Content-Type",
    );
  });

  it("rejects invalid reorder operations and permits one explicit cover", async () => {
    const { repository, media } = createMediaRepository();
    const { storage } = createStorage();
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const app = createTestApp(repository, storage);
    const signed = await signGrant(app);
    const uploaded = await request(app)
      .post(signed.body.data.uploadUrl)
      .set("Authorization", `Bearer ${await tokenFor(adminId)}`)
      .set("X-Requested-With", "XMLHttpRequest")
      .set("X-Upload-Token", signed.body.data.uploadToken)
      .set("X-Upload-Content-Type", "image/png")
      .set("Content-Type", "application/octet-stream")
      .send(await validPng())
      .expect(201);

    const response = await request(app)
      .patch("/api/admin/media/reorder")
      .set("Authorization", `Bearer ${await tokenFor(adminId)}`)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        listingId,
        media: [{ id: uploaded.body.data.id, sortOrder: 0, isCover: true }],
      })
      .expect(200);

    expect(response.body.data[0].isCover).toBe(true);
    expect(media.get(uploaded.body.data.id)?.sortOrder).toBe(0);

    await request(app)
      .patch("/api/admin/media/reorder")
      .set("Authorization", `Bearer ${await tokenFor(adminId)}`)
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ listingId, media: [] })
      .expect(400);
  });

  it("deletes stored media and returns the associated listing for cache refresh", async () => {
    const { repository } = createMediaRepository();
    const { storage, stored } = createStorage();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 200 })),
    );
    const app = createTestApp(repository, storage);
    const signed = await signGrant(app);
    const uploaded = await request(app)
      .post(signed.body.data.uploadUrl)
      .set("Authorization", `Bearer ${await tokenFor(adminId)}`)
      .set("X-Requested-With", "XMLHttpRequest")
      .set("X-Upload-Token", signed.body.data.uploadToken)
      .set("X-Upload-Content-Type", "image/png")
      .set("Content-Type", "application/octet-stream")
      .send(await validPng())
      .expect(201);
    const publicId = uploaded.body.data.publicId;

    const removed = await request(app)
      .delete(`/api/admin/media/${uploaded.body.data.id}`)
      .set("Authorization", `Bearer ${await tokenFor(adminId)}`)
      .set("X-Requested-With", "XMLHttpRequest")
      .expect(200);

    expect(removed.body.data.id).toBe(uploaded.body.data.id);
    expect(stored.has(publicId)).toBe(false);
  });
});
