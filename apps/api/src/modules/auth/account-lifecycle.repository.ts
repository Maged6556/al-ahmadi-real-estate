import { EmailTokenType, Prisma, PrismaClient, UserRole } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export type AccountProfile = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  preferredLocale: string;
  emailVerifiedAt: Date | null;
  termsAcceptedAt: Date | null;
  termsVersion: string | null;
  privacyVersion: string | null;
};

export type LifecycleUser = AccountProfile & {
  passwordHash: string;
  isActive: boolean;
};

export interface AccountLifecycleRepository {
  findUserByEmail(email: string): Promise<LifecycleUser | null>;
  findUserById(id: string): Promise<LifecycleUser | null>;
  createToken(input: {
    userId: string;
    type: EmailTokenType;
    tokenHash: string;
    expiresAt: Date;
    targetEmail?: string;
  }): Promise<void>;
  verifyEmail(tokenHash: string, now: Date): Promise<boolean>;
  resetPassword(
    tokenHash: string,
    passwordHash: string,
    now: Date,
  ): Promise<LifecycleUser | null>;
  changeEmail(tokenHash: string, now: Date): Promise<LifecycleUser | null>;
  updateProfile(
    userId: string,
    input: { name: string | null; preferredLocale: string },
  ): Promise<AccountProfile>;
  updatePassword(
    userId: string,
    passwordHash: string,
    now: Date,
  ): Promise<void>;
  deleteAccount(
    userId: string,
    anonymizedPasswordHash: string,
    now: Date,
  ): Promise<"deleted" | "not_found" | "last_admin">;
}

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  preferredLocale: true,
  emailVerifiedAt: true,
  termsAcceptedAt: true,
  termsVersion: true,
  privacyVersion: true,
  passwordHash: true,
  isActive: true,
} satisfies Prisma.UserSelect;

function isPrismaUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export function createAccountLifecycleRepository(
  client: PrismaClient,
): AccountLifecycleRepository {
  return {
    findUserByEmail(email) {
      return client.user.findUnique({
        where: { email: email.trim().toLowerCase() },
        select: userSelect,
      });
    },

    findUserById(id) {
      return client.user.findUnique({ where: { id }, select: userSelect });
    },

    async createToken(input) {
      const now = new Date();
      await client.$transaction([
        client.emailToken.updateMany({
          where: { userId: input.userId, type: input.type, usedAt: null },
          data: { usedAt: now },
        }),
        client.emailToken.create({
          data: {
            userId: input.userId,
            type: input.type,
            tokenHash: input.tokenHash,
            expiresAt: input.expiresAt,
            targetEmail: input.targetEmail,
          },
          select: { id: true },
        }),
      ]);
    },

    async verifyEmail(tokenHash, now) {
      return client.$transaction(async (transaction) => {
        const token = await transaction.emailToken.findUnique({
          where: { tokenHash },
          select: {
            id: true,
            userId: true,
            type: true,
            expiresAt: true,
            usedAt: true,
          },
        });
        if (
          !token ||
          token.type !== EmailTokenType.VERIFY_EMAIL ||
          token.usedAt ||
          token.expiresAt <= now
        ) {
          return false;
        }

        const claimed = await transaction.emailToken.updateMany({
          where: { id: token.id, usedAt: null, expiresAt: { gt: now } },
          data: { usedAt: now },
        });
        if (claimed.count !== 1) return false;

        await transaction.user.updateMany({
          where: { id: token.userId, isActive: true, emailVerifiedAt: null },
          data: { emailVerifiedAt: now },
        });
        return true;
      });
    },

    async resetPassword(tokenHash, passwordHash, now) {
      return client.$transaction(async (transaction) => {
        const token = await transaction.emailToken.findUnique({
          where: { tokenHash },
          include: { user: { select: userSelect } },
        });
        if (
          !token ||
          token.type !== EmailTokenType.RESET_PASSWORD ||
          token.usedAt ||
          token.expiresAt <= now ||
          !token.user.isActive
        ) {
          return null;
        }

        const claimed = await transaction.emailToken.updateMany({
          where: {
            id: token.id,
            usedAt: null,
            expiresAt: { gt: now },
          },
          data: { usedAt: now },
        });
        if (claimed.count !== 1) return null;

        await transaction.user.update({
          where: { id: token.userId },
          data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
          select: { id: true },
        });
        await transaction.refreshToken.updateMany({
          where: { userId: token.userId, revokedAt: null },
          data: { revokedAt: now },
        });
        return token.user;
      });
    },

    async changeEmail(tokenHash, now) {
      try {
        return await client.$transaction(async (transaction) => {
          const token = await transaction.emailToken.findUnique({
            where: { tokenHash },
            include: { user: { select: userSelect } },
          });
          if (
            !token ||
            token.type !== EmailTokenType.CHANGE_EMAIL ||
            !token.targetEmail ||
            token.usedAt ||
            token.expiresAt <= now ||
            !token.user.isActive
          ) {
            return null;
          }

          const claimed = await transaction.emailToken.updateMany({
            where: { id: token.id, usedAt: null, expiresAt: { gt: now } },
            data: { usedAt: now },
          });
          if (claimed.count !== 1) return null;

          await transaction.user.update({
            where: { id: token.userId },
            data: { email: token.targetEmail, emailVerifiedAt: now },
            select: { id: true },
          });
          return {
            ...token.user,
            email: token.targetEmail,
            emailVerifiedAt: now,
          };
        });
      } catch (error) {
        if (isPrismaUniqueViolation(error)) return null;
        throw error;
      }
    },

    updateProfile(userId, input) {
      return client.user.update({
        where: { id: userId },
        data: input,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          preferredLocale: true,
          emailVerifiedAt: true,
          termsAcceptedAt: true,
          termsVersion: true,
          privacyVersion: true,
        },
      });
    },

    async updatePassword(userId, passwordHash, now) {
      await client.$transaction([
        client.user.update({
          where: { id: userId },
          data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
          select: { id: true },
        }),
        client.refreshToken.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: now },
        }),
      ]);
    },

    async deleteAccount(userId, anonymizedPasswordHash, now) {
      return client.$transaction(
        async (transaction) => {
          const user = await transaction.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, isActive: true },
          });
          if (!user || !user.isActive) return "not_found";

          if (user.role === UserRole.ADMIN) {
            const admins = await transaction.user.count({
              where: { role: UserRole.ADMIN, isActive: true },
            });
            if (admins <= 1) return "last_admin";
          }

          await transaction.favorite.deleteMany({ where: { userId } });
          await transaction.emailToken.deleteMany({ where: { userId } });
          await transaction.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: now, ip: null, userAgent: null },
          });
          await transaction.user.update({
            where: { id: userId },
            data: {
              email: `deleted+${userId}@accounts.invalid`,
              passwordHash: anonymizedPasswordHash,
              name: null,
              preferredLocale: "ar",
              emailVerifiedAt: null,
              isActive: false,
            },
            select: { id: true },
          });
          return "deleted";
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    },
  };
}

export const accountLifecycleRepository =
  createAccountLifecycleRepository(prisma);
