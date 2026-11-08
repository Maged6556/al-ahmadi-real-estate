import { Prisma, PrismaClient, UserRole } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export type AuthUser = {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  role: UserRole;
  preferredLocale: string;
  emailVerifiedAt: Date | null;
  isActive: boolean;
  failedLoginCount: number;
  lockedUntil: Date | null;
};

export type RefreshMetadata = {
  userAgent: string | null;
  ip: string | null;
};

export type RefreshRotationResult =
  { status: "rotated"; user: AuthUser } | { status: "invalid" | "reused" };

export interface AuthRepository {
  findUserByEmail(email: string): Promise<AuthUser | null>;
  findUserById(id: string): Promise<AuthUser | null>;
  createUser(input: {
    email: string;
    passwordHash: string;
    name?: string;
    preferredLocale: string;
    termsAcceptedAt: Date;
    termsVersion: string;
    privacyVersion: string;
  }): Promise<AuthUser>;
  recordFailedLogin(
    userId: string,
    threshold: number,
    lockDurationMs: number,
  ): Promise<number>;
  resetFailedLogins(userId: string): Promise<void>;
  createRefreshToken(input: {
    userId: string;
    tokenHash: string;
    family: string;
    expiresAt: Date;
    metadata: RefreshMetadata;
  }): Promise<void>;
  rotateRefreshToken(input: {
    tokenHash: string;
    nextTokenHash: string;
    expiresAt: Date;
    metadata: RefreshMetadata;
    now: Date;
  }): Promise<RefreshRotationResult>;
  revokeRefreshFamily(tokenHash: string, revokedAt: Date): Promise<void>;
}

const authUserSelect = {
  id: true,
  email: true,
  passwordHash: true,
  name: true,
  role: true,
  preferredLocale: true,
  emailVerifiedAt: true,
  isActive: true,
  failedLoginCount: true,
  lockedUntil: true,
} satisfies Prisma.UserSelect;

const refreshUserSelect = {
  ...authUserSelect,
} satisfies Prisma.UserSelect;

function authUserFromRefresh(
  user: Prisma.UserGetPayload<{ select: typeof refreshUserSelect }>,
): AuthUser {
  return user;
}

export function createAuthRepository(client: PrismaClient): AuthRepository {
  return {
    findUserByEmail(email) {
      return client.user.findUnique({
        where: { email: email.trim().toLowerCase() },
        select: authUserSelect,
      });
    },

    findUserById(id) {
      return client.user.findUnique({
        where: { id },
        select: authUserSelect,
      });
    },

    createUser(input) {
      return client.user.create({
        data: {
          email: input.email.trim().toLowerCase(),
          passwordHash: input.passwordHash,
          name: input.name,
          preferredLocale: input.preferredLocale,
          termsAcceptedAt: input.termsAcceptedAt,
          termsVersion: input.termsVersion,
          privacyVersion: input.privacyVersion,
          role: UserRole.USER,
        },
        select: authUserSelect,
      });
    },

    async recordFailedLogin(userId, threshold, lockDurationMs) {
      const lockedUntil = new Date(Date.now() + lockDurationMs);
      const rows = await client.$queryRaw<{ failedLoginCount: number }[]>`
        UPDATE "User"
        SET
          "failedLoginCount" = "failedLoginCount" + 1,
          "lockedUntil" = CASE
            WHEN "failedLoginCount" + 1 >= ${threshold} THEN ${lockedUntil}
            ELSE "lockedUntil"
          END
        WHERE "id" = ${userId}::uuid
        RETURNING "failedLoginCount"
      `;

      return rows[0]?.failedLoginCount ?? 0;
    },

    async resetFailedLogins(userId) {
      await client.user.update({
        where: { id: userId },
        data: { failedLoginCount: 0, lockedUntil: null },
        select: { id: true },
      });
    },

    async createRefreshToken(input) {
      await client.refreshToken.create({
        data: {
          userId: input.userId,
          tokenHash: input.tokenHash,
          family: input.family,
          expiresAt: input.expiresAt,
          userAgent: input.metadata.userAgent,
          ip: input.metadata.ip,
        },
        select: { id: true },
      });
    },

    async rotateRefreshToken(input) {
      return client.$transaction(async (transaction) => {
        const existing = await transaction.refreshToken.findUnique({
          where: { tokenHash: input.tokenHash },
          include: { user: { select: refreshUserSelect } },
        });

        if (!existing) {
          return { status: "invalid" };
        }

        if (existing.revokedAt || existing.expiresAt <= input.now) {
          await transaction.refreshToken.updateMany({
            where: { family: existing.family, revokedAt: null },
            data: { revokedAt: input.now },
          });
          return { status: existing.revokedAt ? "reused" : "invalid" };
        }

        if (!existing.user.isActive) {
          await transaction.refreshToken.updateMany({
            where: { family: existing.family, revokedAt: null },
            data: { revokedAt: input.now },
          });
          return { status: "invalid" };
        }

        const revoked = await transaction.refreshToken.updateMany({
          where: {
            id: existing.id,
            revokedAt: null,
            expiresAt: { gt: input.now },
          },
          data: { revokedAt: input.now },
        });

        if (revoked.count !== 1) {
          await transaction.refreshToken.updateMany({
            where: { family: existing.family, revokedAt: null },
            data: { revokedAt: input.now },
          });
          return { status: "reused" };
        }

        await transaction.refreshToken.create({
          data: {
            userId: existing.userId,
            tokenHash: input.nextTokenHash,
            family: existing.family,
            expiresAt: input.expiresAt,
            userAgent: input.metadata.userAgent,
            ip: input.metadata.ip,
          },
          select: { id: true },
        });

        return {
          status: "rotated",
          user: authUserFromRefresh(existing.user),
        };
      });
    },

    async revokeRefreshFamily(tokenHash, revokedAt) {
      const token = await client.refreshToken.findUnique({
        where: { tokenHash },
        select: { family: true },
      });

      if (!token) {
        return;
      }

      await client.refreshToken.updateMany({
        where: { family: token.family, revokedAt: null },
        data: { revokedAt },
      });
    },
  };
}

export const authRepository = createAuthRepository(prisma);
