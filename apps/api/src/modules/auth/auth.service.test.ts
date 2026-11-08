import { createHash } from "node:crypto";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import express from "express";
import { rateLimit } from "express-rate-limit";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import type { ApiEnv } from "../../config/env.js";
import { errorHandler } from "../../middleware/error.js";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import type { ApiRateLimiters } from "../../middleware/rate-limit.js";
import { requestId } from "../../middleware/request-id.js";
import type {
  AuthRepository,
  AuthUser,
  RefreshMetadata,
  RefreshRotationResult,
} from "./auth.repository.js";
import { AuthService } from "./auth.service.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";
import { can } from "./permissions.js";

function testRateLimiters(): ApiRateLimiters {
  const limiter = rateLimit({
    windowMs: 60_000,
    limit: 1_000,
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

function testEnvironment(): ApiEnv {
  return {
    NODE_ENV: "test",
    API_PORT: 4000,
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    DIRECT_URL: "postgresql://test:test@localhost:5432/test",
    REDIS_URL: "redis://localhost:6379",
    CORS_ORIGIN: "http://localhost:3000",
    JWT_ACCESS_SECRET: config.accessTokenSecret,
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

const config = {
  accessTokenSecret: "test-secret-with-more-than-thirty-two-bytes",
  accessTokenTtlSeconds: 900,
  refreshTokenTtlDays: 30,
};

const metadata: RefreshMetadata = {
  userAgent: "auth-test",
  ip: "127.0.0.1",
};

function setCookieValues(header: unknown) {
  const values: unknown[] = Array.isArray(header)
    ? header
    : typeof header === "string"
      ? [header]
      : [];

  return values.filter((value): value is string => typeof value === "string");
}

function cookiePairs(header: unknown) {
  return setCookieValues(header).map((value) => value.split(";", 1)[0]);
}

function registrationInput(input: Record<string, unknown>) {
  return registerSchema.parse({ ...input, termsAccepted: true });
}

class InMemoryAuthRepository implements AuthRepository {
  users = new Map<string, AuthUser>();
  tokens = new Map<
    string,
    {
      userId: string;
      family: string;
      expiresAt: Date;
      revokedAt: Date | null;
    }
  >();

  async findUserByEmail(email: string) {
    return (
      [...this.users.values()].find((user) => user.email === email) ?? null
    );
  }

  async findUserById(id: string) {
    return this.users.get(id) ?? null;
  }

  async createUser(input: {
    email: string;
    passwordHash: string;
    name?: string;
    preferredLocale: string;
    termsAcceptedAt: Date;
    termsVersion: string;
    privacyVersion: string;
  }) {
    const user: AuthUser = {
      id: crypto.randomUUID(),
      email: input.email,
      passwordHash: input.passwordHash,
      name: input.name ?? null,
      role: UserRole.USER,
      preferredLocale: input.preferredLocale,
      emailVerifiedAt: null,
      isActive: true,
      failedLoginCount: 0,
      lockedUntil: null,
    };
    this.users.set(user.id, user);
    return user;
  }

  async recordFailedLogin(
    userId: string,
    threshold: number,
    lockDurationMs: number,
  ) {
    const user = this.users.get(userId);
    if (!user) {
      return 0;
    }

    user.failedLoginCount += 1;
    if (user.failedLoginCount >= threshold) {
      user.lockedUntil = new Date(Date.now() + lockDurationMs);
    }
    return user.failedLoginCount;
  }

  async resetFailedLogins(userId: string) {
    const user = this.users.get(userId);
    if (user) {
      user.failedLoginCount = 0;
      user.lockedUntil = null;
    }
  }

  async createRefreshToken(input: {
    userId: string;
    tokenHash: string;
    family: string;
    expiresAt: Date;
    metadata: RefreshMetadata;
  }) {
    this.tokens.set(input.tokenHash, {
      userId: input.userId,
      family: input.family,
      expiresAt: input.expiresAt,
      revokedAt: null,
    });
  }

  async rotateRefreshToken(input: {
    tokenHash: string;
    nextTokenHash: string;
    expiresAt: Date;
    metadata: RefreshMetadata;
    now: Date;
  }): Promise<RefreshRotationResult> {
    const token = this.tokens.get(input.tokenHash);
    if (!token) {
      return { status: "invalid" };
    }

    if (token.revokedAt || token.expiresAt <= input.now) {
      this.revokeFamily(token.family, input.now);
      return { status: token.revokedAt ? "reused" : "invalid" };
    }

    const user = this.users.get(token.userId);
    if (!user?.isActive) {
      this.revokeFamily(token.family, input.now);
      return { status: "invalid" };
    }

    token.revokedAt = input.now;
    this.tokens.set(input.nextTokenHash, {
      userId: token.userId,
      family: token.family,
      expiresAt: input.expiresAt,
      revokedAt: null,
    });

    return { status: "rotated", user };
  }

  async revokeRefreshFamily(tokenHash: string, revokedAt: Date) {
    const token = this.tokens.get(tokenHash);
    if (token) {
      this.revokeFamily(token.family, revokedAt);
    }
  }

  private revokeFamily(family: string, revokedAt: Date) {
    for (const token of this.tokens.values()) {
      if (token.family === family && !token.revokedAt) {
        token.revokedAt = revokedAt;
      }
    }
  }
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

describe("AuthService", () => {
  let repository: InMemoryAuthRepository;
  let service: AuthService;

  beforeEach(() => {
    repository = new InMemoryAuthRepository();
    service = new AuthService(repository, config);
  });

  it("normalizes registration email, creates only USER accounts, and stores a password hash", async () => {
    const input = registrationInput({
      email: "  AGENT@Example.com ",
      password: "a-strong-password",
    });
    const session = await service.register(input, metadata);
    const stored = await repository.findUserById(session.user.id);

    expect(session.user.email).toBe("agent@example.com");
    expect(session.user.role).toBe(UserRole.USER);
    expect(stored?.passwordHash).not.toBe("a-strong-password");
    await expect(
      bcrypt.compare("a-strong-password", stored!.passwordHash),
    ).resolves.toBe(true);
    expect(repository.tokens.has(hashToken(session.refreshToken))).toBe(true);
  });

  it("rejects malformed, short, oversized, and unexpected registration fields", () => {
    expect(
      registerSchema.safeParse({
        email: "user@example.com",
        password: "a-strong-password",
      }).success,
    ).toBe(false);
    expect(() =>
      registrationInput({
        email: "not-an-email",
        password: "short",
      }),
    ).toThrow();
    expect(() =>
      registrationInput({
        email: "user@example.com",
        password: "🙂".repeat(19),
      }),
    ).toThrow();
    expect(() =>
      registrationInput({
        email: "user@example.com",
        password: "a-strong-password",
        role: "ADMIN",
      }),
    ).toThrow();
    expect(() =>
      loginSchema.parse({
        email: "user@example.com",
        password: "🙂".repeat(19),
      }),
    ).toThrow();
  });

  it("uses the same login error for existing and unknown accounts", async () => {
    await service.register(
      registrationInput({
        email: "known@example.com",
        password: "a-strong-password",
      }),
      metadata,
    );
    const knownAccount = service.login(
      { email: "known@example.com", password: "incorrect-password" },
      metadata,
    );
    const unknownAccount = service.login(
      { email: "unknown@example.com", password: "incorrect-password" },
      metadata,
    );

    const expectedLoginError = {
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password.",
    };
    const knownAccountAssertion =
      expect(knownAccount).rejects.toMatchObject(expectedLoginError);
    const unknownAccountAssertion =
      expect(unknownAccount).rejects.toMatchObject(expectedLoginError);
    await Promise.all([knownAccountAssertion, unknownAccountAssertion]);
  });

  it("locks an account for 15 minutes after five failed login attempts", async () => {
    const registered = await service.register(
      registrationInput({
        email: "lock@example.com",
        password: "a-strong-password",
      }),
      metadata,
    );

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        service.login(
          { email: registered.user.email, password: "incorrect-password" },
          metadata,
        ),
      ).rejects.toMatchObject({ statusCode: 401, code: "INVALID_CREDENTIALS" });
    }

    const user = await repository.findUserById(registered.user.id);
    expect(user?.failedLoginCount).toBe(5);
    expect(user?.lockedUntil?.getTime()).toBeGreaterThan(Date.now());
    await expect(
      service.login(
        { email: registered.user.email, password: "a-strong-password" },
        metadata,
      ),
    ).rejects.toMatchObject({ statusCode: 401, code: "INVALID_CREDENTIALS" });
  });

  it("rotates refresh tokens and revokes their family after token reuse", async () => {
    const original = await service.register(
      registrationInput({
        email: "rotate@example.com",
        password: "a-strong-password",
      }),
      metadata,
    );
    const rotated = await service.refresh(original.refreshToken, metadata);

    expect(rotated.refreshToken).not.toBe(original.refreshToken);
    await expect(
      service.refresh(original.refreshToken, metadata),
    ).rejects.toMatchObject({
      statusCode: 401,
    });
    await expect(
      service.refresh(rotated.refreshToken, metadata),
    ).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("authenticates active users and rejects revoked or deactivated accounts", async () => {
    const session = await service.register(
      registrationInput({
        email: "active@example.com",
        password: "a-strong-password",
      }),
      metadata,
    );
    await expect(
      service.authenticate(session.accessToken),
    ).resolves.toMatchObject({
      email: "active@example.com",
    });

    const user = await repository.findUserById(session.user.id);
    if (user) {
      user.isActive = false;
    }
    await expect(service.authenticate(session.accessToken)).resolves.toBeNull();
  });

  it("sets HttpOnly auth cookies and returns a safe user DTO from /me", async () => {
    const app = createApp(testEnvironment(), {
      authRepository: repository,
      rateLimiters: testRateLimiters(),
    });
    const response = await request(app)
      .post("/api/auth/register")
      .set("Origin", "http://localhost:3000")
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        email: "route@example.com",
        password: "a-strong-password",
        role: "ADMIN",
        termsAccepted: true,
      });

    expect(response.status).toBe(400);

    const registered = await request(app)
      .post("/api/auth/register")
      .set("Origin", "http://localhost:3000")
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        email: "route@example.com",
        password: "a-strong-password",
        termsAccepted: true,
      });

    expect(registered.status).toBe(201);
    expect(registered.headers["cache-control"]).toBe("no-store");
    expect(registered.headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(registered.headers["x-content-type-options"]).toBe("nosniff");
    expect(registered.headers["permissions-policy"]).toContain("camera=()");
    expect(registered.body.data.user.role).toBe("USER");
    expect(registered.body.data.user).not.toHaveProperty("passwordHash");
    expect(registered.body.data).not.toHaveProperty("accessToken");

    const rawSetCookie: unknown = registered.headers["set-cookie"];
    const setCookies = setCookieValues(rawSetCookie);
    const cookies = cookiePairs(rawSetCookie);
    expect(setCookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining("access_token="),
        expect.stringContaining("refresh_token="),
      ]),
    );
    expect(setCookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining("HttpOnly"),
        expect.stringContaining("SameSite=Lax"),
      ]),
    );

    const me = await request(app).get("/api/auth/me").set("Cookie", cookies);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe("route@example.com");
    expect(me.body.data.user).not.toHaveProperty("failedLoginCount");
    expect(me.body.data.user).not.toHaveProperty("passwordHash");

    const productionApp = createApp(
      { ...testEnvironment(), NODE_ENV: "production" },
      {
        authRepository: repository,
        rateLimiters: testRateLimiters(),
      },
    );
    const productionRegister = await request(productionApp)
      .post("/api/auth/register")
      .set("Origin", "http://localhost:3000")
      .set("X-Requested-With", "XMLHttpRequest")
      .send({
        email: "secure-cookie@example.com",
        password: "a-strong-password",
        termsAccepted: true,
      });
    expect(setCookieValues(productionRegister.headers["set-cookie"])).toEqual(
      expect.arrayContaining([expect.stringContaining("Secure")]),
    );

    const unauthenticated = await request(app).get("/api/auth/me");
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body.error.requestId).toBeTruthy();
  });

  it("rotates refresh cookies and revokes the session family on logout", async () => {
    const app = createApp(testEnvironment(), {
      authRepository: repository,
      rateLimiters: testRateLimiters(),
    });
    const csrfHeaders = {
      Origin: "http://localhost:3000",
      "X-Requested-With": "XMLHttpRequest",
    };
    const registered = await request(app)
      .post("/api/auth/register")
      .set(csrfHeaders)
      .send({
        email: "refresh-route@example.com",
        password: "a-strong-password",
        termsAccepted: true,
      });
    const initialCookies = cookiePairs(registered.headers["set-cookie"]);
    const refreshed = await request(app)
      .post("/api/auth/refresh")
      .set(csrfHeaders)
      .set("Cookie", initialCookies);

    expect(refreshed.status).toBe(200);
    const rotatedCookies = cookiePairs(refreshed.headers["set-cookie"]);
    expect(rotatedCookies[1]).not.toBe(initialCookies[1]);

    const loggedOut = await request(app)
      .post("/api/auth/logout")
      .set(csrfHeaders)
      .set("Cookie", rotatedCookies);
    expect(loggedOut.status).toBe(204);

    const replay = await request(app)
      .post("/api/auth/refresh")
      .set(csrfHeaders)
      .set("Cookie", rotatedCookies);
    expect(replay.status).toBe(401);
  });

  it("rejects state-changing requests without the CSRF request header", async () => {
    const app = createApp(testEnvironment(), {
      authRepository: repository,
      rateLimiters: testRateLimiters(),
    });
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "a-strong-password" });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("CSRF_REJECTED");

    const crossOrigin = await request(app)
      .post("/api/auth/login")
      .set("Origin", "https://attacker.example")
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ email: "nobody@example.com", password: "a-strong-password" });
    expect(crossOrigin.status).toBe(403);
  });

  it("enforces the 401/403 role matrix through authentication middleware", async () => {
    const session = await service.register(
      registrationInput({
        email: "editor@example.com",
        password: "a-strong-password",
      }),
      metadata,
    );
    const user = await repository.findUserById(session.user.id);
    if (user) {
      user.role = UserRole.EDITOR;
    }

    const rbacApp = express();
    rbacApp.use(requestId);
    rbacApp.get(
      "/admin/users",
      requireAuth(service),
      requirePermission("admin:manage_users"),
      (_request, response) => response.status(200).json({ data: true }),
    );
    rbacApp.get(
      "/admin/listings",
      requireAuth(service),
      requirePermission("listing:write"),
      (_request, response) => response.status(200).json({ data: true }),
    );
    rbacApp.use(errorHandler);

    expect((await request(rbacApp).get("/admin/users")).status).toBe(401);
    expect(
      (
        await request(rbacApp)
          .get("/admin/users")
          .set("Authorization", `Bearer ${session.accessToken}`)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(rbacApp)
          .get("/admin/listings")
          .set("Authorization", `Bearer ${session.accessToken}`)
      ).status,
    ).toBe(200);

    if (user) {
      user.role = UserRole.ADMIN;
    }
    expect(
      (
        await request(rbacApp)
          .get("/admin/users")
          .set("Authorization", `Bearer ${session.accessToken}`)
      ).status,
    ).toBe(200);
    expect(can({ role: UserRole.USER }, "admin:access")).toBe(false);
  });
});
