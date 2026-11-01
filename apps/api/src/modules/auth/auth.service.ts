import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { LEGAL_PRIVACY_VERSION, LEGAL_TERMS_VERSION } from "@al-ahmadi/shared";
import { AppError } from "../../lib/app-error.js";
import type { LoginInput, RegisterInput } from "./auth.schemas.js";
import type {
  AuthRepository,
  AuthUser,
  RefreshMetadata,
} from "./auth.repository.js";

const PASSWORD_HASH_COST = 12;
const MAX_FAILED_LOGINS = 5;
const ACCOUNT_LOCK_MS = 15 * 60 * 1000;
const ACCESS_TOKEN_ISSUER = "al-ahmadi-api";
const ACCESS_TOKEN_AUDIENCE = "al-ahmadi-web";

export type PublicUser = Pick<
  AuthUser,
  "id" | "email" | "name" | "role" | "preferredLocale" | "emailVerifiedAt"
>;

export type AuthSession = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresAt: Date;
};

function toPublicUser(user: AuthUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    preferredLocale: user.preferredLocale,
    emailVerifiedAt: user.emailVerifiedAt,
  };
}

function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

const dummyPasswordHash = bcrypt.hash(
  randomBytes(32).toString("hex"),
  PASSWORD_HASH_COST,
);

async function comparePassword(password: string, passwordHash: string | null) {
  if (!passwordHash) {
    await bcrypt.compare(password, await dummyPasswordHash);
    return false;
  }

  return bcrypt.compare(password, passwordHash);
}

export class AuthService {
  private readonly accessTokenSecret: Uint8Array;

  constructor(
    private readonly repository: AuthRepository,
    private readonly config: {
      accessTokenSecret: string;
      accessTokenTtlSeconds: number;
      refreshTokenTtlDays: number;
    },
  ) {
    this.accessTokenSecret = new TextEncoder().encode(config.accessTokenSecret);
  }

  async register(input: RegisterInput, metadata: RefreshMetadata) {
    const existing = await this.repository.findUserByEmail(input.email);

    if (existing) {
      throw new AppError(
        409,
        "EMAIL_UNAVAILABLE",
        "Unable to create this account.",
      );
    }

    const passwordHash = await bcrypt.hash(input.password, PASSWORD_HASH_COST);
    const user = await this.repository.createUser({
      email: input.email,
      passwordHash,
      name: input.name,
      preferredLocale: input.preferredLocale,
      termsAcceptedAt: new Date(),
      termsVersion: LEGAL_TERMS_VERSION,
      privacyVersion: LEGAL_PRIVACY_VERSION,
    });

    return this.createSession(user, metadata);
  }

  async login(input: LoginInput, metadata: RefreshMetadata) {
    const user = await this.repository.findUserByEmail(input.email);
    const passwordMatches = await comparePassword(
      input.password,
      user?.passwordHash ?? null,
    );
    const isLocked = Boolean(
      user?.lockedUntil && user.lockedUntil.getTime() > Date.now(),
    );

    if (!user || !passwordMatches || !user.isActive || isLocked) {
      if (user?.isActive && !isLocked) {
        await this.repository.recordFailedLogin(
          user.id,
          MAX_FAILED_LOGINS,
          ACCOUNT_LOCK_MS,
        );
      }

      throw new AppError(
        401,
        "INVALID_CREDENTIALS",
        "Invalid email or password.",
      );
    }

    await this.repository.resetFailedLogins(user.id);
    return this.createSession(user, metadata);
  }

  async refresh(token: string | undefined, metadata: RefreshMetadata) {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
    }

    const now = new Date();
    const nextRefreshToken = randomBytes(32).toString("base64url");
    const refreshTokenExpiresAt = this.refreshExpiry(now);
    const result = await this.repository.rotateRefreshToken({
      tokenHash: hashRefreshToken(token),
      nextTokenHash: hashRefreshToken(nextRefreshToken),
      expiresAt: refreshTokenExpiresAt,
      metadata,
      now,
    });

    if (result.status !== "rotated") {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
    }

    return this.createSession(result.user, metadata, {
      refreshToken: nextRefreshToken,
      refreshTokenExpiresAt,
    });
  }

  async logout(token: string | undefined) {
    if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
      await this.repository.revokeRefreshFamily(
        hashRefreshToken(token),
        new Date(),
      );
    }
  }

  async authenticate(accessToken: string | undefined) {
    if (!accessToken) {
      return null;
    }

    let userId: string;

    try {
      const { payload } = await jwtVerify(accessToken, this.accessTokenSecret, {
        issuer: ACCESS_TOKEN_ISSUER,
        audience: ACCESS_TOKEN_AUDIENCE,
        algorithms: ["HS256"],
      });

      if (payload.tokenUse !== "access" || typeof payload.sub !== "string") {
        return null;
      }

      userId = payload.sub;
    } catch {
      return null;
    }

    const user = await this.repository.findUserById(userId);

    if (!user?.isActive) {
      return null;
    }

    return toPublicUser(user);
  }

  private refreshExpiry(now: Date) {
    return new Date(
      now.getTime() + this.config.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    );
  }

  private async createSession(
    user: AuthUser,
    metadata: RefreshMetadata,
    existingRefresh?: {
      refreshToken: string;
      refreshTokenExpiresAt: Date;
    },
  ): Promise<AuthSession> {
    const now = new Date();
    const refreshToken =
      existingRefresh?.refreshToken ?? randomBytes(32).toString("base64url");
    const refreshTokenExpiresAt =
      existingRefresh?.refreshTokenExpiresAt ?? this.refreshExpiry(now);

    if (!existingRefresh) {
      await this.repository.createRefreshToken({
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken),
        family: randomUUID(),
        expiresAt: refreshTokenExpiresAt,
        metadata,
      });
    }

    const accessToken = await new SignJWT({ tokenUse: "access" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(user.id)
      .setIssuer(ACCESS_TOKEN_ISSUER)
      .setAudience(ACCESS_TOKEN_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${this.config.accessTokenTtlSeconds}s`)
      .sign(this.accessTokenSecret);

    return {
      user: toPublicUser(user),
      accessToken,
      refreshToken,
      accessTokenExpiresIn: this.config.accessTokenTtlSeconds,
      refreshTokenExpiresAt,
    };
  }
}

export function isStaff(user: PublicUser) {
  return user.role === UserRole.ADMIN || user.role === UserRole.EDITOR;
}
