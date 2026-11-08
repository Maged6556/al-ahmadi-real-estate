import { EmailTokenType, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AccountLifecycleRepository,
  LifecycleUser,
} from "./account-lifecycle.repository.js";
import { AccountLifecycleService } from "./account-lifecycle.service.js";
import type { MailMessage, MailQueue } from "./mail.queue.js";

const user: LifecycleUser = {
  id: "c6f7d8f6-04ac-44d5-81e2-7e06a9e3aa54",
  email: "person@example.com",
  name: "Person",
  role: UserRole.USER,
  preferredLocale: "en",
  emailVerifiedAt: null,
  termsAcceptedAt: new Date("2026-11-02T00:00:00.000Z"),
  termsVersion: "2026-11-v1",
  privacyVersion: "2026-11-v1",
  passwordHash: "existing-password-hash",
  isActive: true,
};

describe("AccountLifecycleService", () => {
  let repository: AccountLifecycleRepository;
  let mailQueue: MailQueue;
  let queuedMessages: MailMessage[];
  let service: AccountLifecycleService;

  beforeEach(() => {
    queuedMessages = [];
    repository = {
      findUserByEmail: vi.fn().mockResolvedValue(user),
      findUserById: vi.fn().mockResolvedValue(user),
      createToken: vi.fn().mockResolvedValue(undefined),
      verifyEmail: vi.fn().mockResolvedValue(true),
      resetPassword: vi.fn().mockResolvedValue(user),
      changeEmail: vi.fn().mockResolvedValue(user),
      updateProfile: vi.fn().mockResolvedValue(user),
      updatePassword: vi.fn().mockResolvedValue(undefined),
      deleteAccount: vi.fn().mockResolvedValue("deleted"),
    };
    mailQueue = {
      enqueue: vi.fn(async (message: MailMessage) => {
        queuedMessages.push(message);
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    service = new AccountLifecycleService(repository, mailQueue, {
      webBaseUrl: "https://example.test",
    });
  });

  it("stores only a hash for a time-limited single-use verification token", async () => {
    const now = Date.now();
    await service.sendVerificationEmail(user);
    const message = queuedMessages[0];
    const link = message?.html.match(/href="([^"]+)"/)?.[1];
    expect(link).toBeTruthy();

    const actionUrl = new URL(link!);
    const token = new URLSearchParams(actionUrl.hash.slice(1)).get("token");
    const storedToken = vi.mocked(repository.createToken).mock.calls[0]?.[0];
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(actionUrl.search).toBe("");
    expect(storedToken?.type).toBe(EmailTokenType.VERIFY_EMAIL);
    expect(storedToken?.tokenHash).toBe(
      createHash("sha256").update(token!).digest("hex"),
    );
    expect(storedToken?.tokenHash).not.toContain(token);
    expect(storedToken?.expiresAt.getTime()).toBeGreaterThanOrEqual(
      now + 24 * 60 * 60 * 1000 - 100,
    );
    expect(message?.text).toContain(link);
    expect(message?.to).toBe(user.email);
  });

  it("accepts a verification token only once through the hashed repository token", async () => {
    const rawToken = "c".repeat(43);
    await service.confirmEmailLink(rawToken);
    expect(repository.verifyEmail).toHaveBeenCalledWith(
      createHash("sha256").update(rawToken).digest("hex"),
      expect.any(Date),
    );
    expect(repository.changeEmail).not.toHaveBeenCalled();
  });

  it("sends email-change verification to the requested address without updating it yet", async () => {
    vi.mocked(repository.findUserByEmail).mockResolvedValueOnce(null);
    await service.requestEmailChange(user.id, " New.Address@Example.com ");
    const input = vi.mocked(repository.createToken).mock.calls[0]?.[0];
    expect(input?.type).toBe(EmailTokenType.CHANGE_EMAIL);
    expect(input?.targetEmail).toBe("new.address@example.com");
    expect(queuedMessages[0]?.to).toBe("new.address@example.com");
  });

  it("does not issue reset tokens for an unknown account", async () => {
    vi.mocked(repository.findUserByEmail).mockResolvedValueOnce(null);
    await expect(
      service.requestPasswordReset("missing@example.com"),
    ).resolves.toBeUndefined();
    expect(repository.createToken).not.toHaveBeenCalled();
    expect(mailQueue.enqueue).not.toHaveBeenCalled();
  });

  it("hashes new passwords and sends a notice after a valid reset", async () => {
    const rawToken = "a".repeat(43);
    await service.resetPassword(rawToken, "a-new-strong-password");
    const reset = vi.mocked(repository.resetPassword).mock.calls[0];
    expect(reset?.[0]).toBe(
      createHash("sha256").update(rawToken).digest("hex"),
    );
    await expect(
      bcrypt.compare("a-new-strong-password", reset?.[1] ?? ""),
    ).resolves.toBe(true);
    expect(reset?.[2]).toBeInstanceOf(Date);
    expect(queuedMessages[0]?.subject).toBe("Your password was changed");
  });

  it("rejects malformed or expired reset tokens without sending a notice", async () => {
    await expect(
      service.resetPassword("not-a-token", "a-new-strong-password"),
    ).rejects.toMatchObject({ code: "INVALID_OR_EXPIRED_TOKEN" });
    vi.mocked(repository.resetPassword).mockResolvedValueOnce(null);
    await expect(
      service.resetPassword("b".repeat(43), "a-new-strong-password"),
    ).rejects.toMatchObject({ code: "INVALID_OR_EXPIRED_TOKEN" });
    expect(mailQueue.enqueue).not.toHaveBeenCalled();
  });
});
