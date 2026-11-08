import { EmailTokenType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { AppError } from "../../lib/app-error.js";
import type { Locale } from "@al-ahmadi/shared";
import type {
  AccountLifecycleRepository,
  AccountProfile,
} from "./account-lifecycle.repository.js";
import type { MailMessage, MailQueue } from "./mail.queue.js";

const TOKEN_TTL = {
  [EmailTokenType.VERIFY_EMAIL]: 24 * 60 * 60 * 1000,
  [EmailTokenType.RESET_PASSWORD]: 30 * 60 * 1000,
  [EmailTokenType.CHANGE_EMAIL]: 24 * 60 * 60 * 1000,
} satisfies Record<EmailTokenType, number>;

const PASSWORD_HASH_COST = 12;

export const resetRequestResponse = {
  message: "If an account exists for that email, a reset link has been sent.",
} as const;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

function emailMessage(
  locale: Locale,
  kind: "verify" | "reset" | "changed",
  actionUrl?: string,
): MailMessage {
  const content = {
    ar: {
      verify: {
        subject: "تأكيد بريدك الإلكتروني",
        heading: "أكّد بريدك الإلكتروني",
        body: "اضغط على الرابط أدناه لتأكيد عنوان بريدك الإلكتروني. الرابط صالح لمدة 24 ساعة.",
        action: "تأكيد البريد الإلكتروني",
      },
      reset: {
        subject: "إعادة تعيين كلمة المرور",
        heading: "إعادة تعيين كلمة المرور",
        body: "استخدم الرابط أدناه لاختيار كلمة مرور جديدة. الرابط صالح لمدة 30 دقيقة.",
        action: "إعادة تعيين كلمة المرور",
      },
      changed: {
        subject: "تم تغيير كلمة المرور",
        heading: "تم تغيير كلمة المرور",
        body: "تم تغيير كلمة مرور حسابك. إذا لم تقم بهذا التغيير، تواصل معنا فوراً.",
      },
    },
    en: {
      verify: {
        subject: "Verify your email address",
        heading: "Verify your email address",
        body: "Use the link below to verify your email address. This link expires in 24 hours.",
        action: "Verify email",
      },
      reset: {
        subject: "Reset your password",
        heading: "Reset your password",
        body: "Use the link below to choose a new password. This link expires in 30 minutes.",
        action: "Reset password",
      },
      changed: {
        subject: "Your password was changed",
        heading: "Your password was changed",
        body: "Your account password was changed. If you did not make this change, contact us immediately.",
      },
    },
  }[locale][kind];
  const html = `<div style="background:#f7f6f1;padding:32px;font-family:Arial,sans-serif"><table role="presentation" style="max-width:560px;margin:auto;background:#fff;border-radius:12px;padding:32px;width:100%"><tr><td><h1 style="color:#214c43;font-size:24px">${content.heading}</h1><p style="color:#43544f;line-height:1.8">${content.body}</p>${actionUrl ? `<p style="margin:28px 0"><a href="${escapeHtml(actionUrl)}" style="background:#214c43;color:#fff;padding:14px 22px;border-radius:6px;display:inline-block">${content.action}</a></p><p style="word-break:break-all;color:#687874">${escapeHtml(actionUrl)}</p>` : ""}</td></tr></table></div>`;
  const text = `${content.heading}\n\n${content.body}${actionUrl ? `\n\n${content.action}: ${actionUrl}` : ""}`;
  return { to: "", subject: content.subject, html, text };
}

function tokenFromUrl(rawToken: string | undefined) {
  return typeof rawToken === "string" && /^[A-Za-z0-9_-]{43}$/.test(rawToken)
    ? rawToken
    : null;
}

export class AccountLifecycleService {
  constructor(
    private readonly repository: AccountLifecycleRepository,
    private readonly mailQueue: MailQueue,
    private readonly config: { webBaseUrl: string },
  ) {}

  async sendVerificationEmail(
    user: Pick<AccountProfile, "id" | "email" | "preferredLocale">,
  ) {
    const rawToken = await this.issueToken(
      user.id,
      EmailTokenType.VERIFY_EMAIL,
    );
    const locale = user.preferredLocale === "en" ? "en" : "ar";
    const url = new URL(`/${locale}/verify-email`, this.config.webBaseUrl);
    url.hash = new URLSearchParams({ token: rawToken }).toString();
    await this.mailQueue.enqueue({
      ...emailMessage(locale, "verify", url.toString()),
      to: user.email,
    });
  }

  async confirmEmailLink(rawToken: string | undefined) {
    const token = tokenFromUrl(rawToken);
    if (!token) {
      throw new AppError(
        400,
        "INVALID_OR_EXPIRED_TOKEN",
        "This link is invalid or has expired.",
      );
    }
    const tokenHash = hashToken(token);
    if (await this.repository.verifyEmail(tokenHash, new Date())) return;
    if (await this.repository.changeEmail(tokenHash, new Date())) return;
    throw new AppError(
      400,
      "INVALID_OR_EXPIRED_TOKEN",
      "This link is invalid or has expired.",
    );
  }

  async requestPasswordReset(email: string) {
    const user = await this.repository.findUserByEmail(email);
    if (!user?.isActive) return;

    const rawToken = await this.issueToken(
      user.id,
      EmailTokenType.RESET_PASSWORD,
    );
    const locale = user.preferredLocale === "en" ? "en" : "ar";
    const url = new URL(`/${locale}/reset-password`, this.config.webBaseUrl);
    url.hash = new URLSearchParams({ token: rawToken }).toString();
    await this.mailQueue.enqueue({
      ...emailMessage(locale, "reset", url.toString()),
      to: user.email,
    });
  }

  async resetPassword(rawToken: string | undefined, password: string) {
    const token = tokenFromUrl(rawToken);
    if (!token) {
      throw new AppError(
        400,
        "INVALID_OR_EXPIRED_TOKEN",
        "This link is invalid or has expired.",
      );
    }

    const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_COST);
    const user = await this.repository.resetPassword(
      hashToken(token),
      passwordHash,
      new Date(),
    );
    if (!user) {
      throw new AppError(
        400,
        "INVALID_OR_EXPIRED_TOKEN",
        "This link is invalid or has expired.",
      );
    }

    const locale = user.preferredLocale === "en" ? "en" : "ar";
    await this.mailQueue.enqueue({
      ...emailMessage(locale, "changed"),
      to: user.email,
    });
  }

  async requestEmailChange(userId: string, newEmail: string) {
    const user = await this.repository.findUserById(userId);
    if (!user?.isActive) {
      throw new AppError(404, "ACCOUNT_NOT_FOUND", "Account not found.");
    }

    const normalizedEmail = newEmail.trim().toLowerCase();
    if (normalizedEmail === user.email) return;
    if (await this.repository.findUserByEmail(normalizedEmail)) {
      throw new AppError(
        409,
        "EMAIL_UNAVAILABLE",
        "Unable to change this email address.",
      );
    }

    const rawToken = await this.issueToken(
      user.id,
      EmailTokenType.CHANGE_EMAIL,
      normalizedEmail,
    );
    const locale = user.preferredLocale === "en" ? "en" : "ar";
    const url = new URL(`/${locale}/verify-email`, this.config.webBaseUrl);
    url.hash = new URLSearchParams({ token: rawToken }).toString();
    await this.mailQueue.enqueue({
      ...emailMessage(locale, "verify", url.toString()),
      to: normalizedEmail,
    });
  }

  async confirmEmailChange(rawToken: string | undefined) {
    const token = tokenFromUrl(rawToken);
    const user = token
      ? await this.repository.changeEmail(hashToken(token), new Date())
      : null;
    if (!user) {
      throw new AppError(
        400,
        "INVALID_OR_EXPIRED_TOKEN",
        "This link is invalid, expired, or the email is unavailable.",
      );
    }
    return user;
  }

  async updateProfile(
    userId: string,
    input: { name: string | null; preferredLocale: Locale },
  ) {
    return this.repository.updateProfile(userId, input);
  }

  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.repository.findUserById(userId);
    if (
      !user?.isActive ||
      !(await bcrypt.compare(currentPassword, user.passwordHash))
    ) {
      throw new AppError(
        400,
        "INVALID_CURRENT_PASSWORD",
        "Current password is incorrect.",
      );
    }

    await this.repository.updatePassword(
      userId,
      await bcrypt.hash(newPassword, PASSWORD_HASH_COST),
      new Date(),
    );
    const locale = user.preferredLocale === "en" ? "en" : "ar";
    await this.mailQueue.enqueue({
      ...emailMessage(locale, "changed"),
      to: user.email,
    });
  }

  async deleteAccount(userId: string, currentPassword: string) {
    const user = await this.repository.findUserById(userId);
    if (
      !user?.isActive ||
      !(await bcrypt.compare(currentPassword, user.passwordHash))
    ) {
      throw new AppError(
        400,
        "INVALID_CURRENT_PASSWORD",
        "Current password is incorrect.",
      );
    }

    const result = await this.repository.deleteAccount(
      userId,
      await bcrypt.hash(randomBytes(32).toString("hex"), PASSWORD_HASH_COST),
      new Date(),
    );
    if (result === "not_found") {
      throw new AppError(404, "ACCOUNT_NOT_FOUND", "Account not found.");
    }
    if (result === "last_admin") {
      throw new AppError(
        409,
        "LAST_ADMIN",
        "The last active administrator cannot delete this account.",
      );
    }
  }

  async getProfile(userId: string) {
    const user = await this.repository.findUserById(userId);
    if (!user?.isActive) {
      throw new AppError(404, "ACCOUNT_NOT_FOUND", "Account not found.");
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      preferredLocale: user.preferredLocale,
      emailVerifiedAt: user.emailVerifiedAt,
      termsAcceptedAt: user.termsAcceptedAt,
      termsVersion: user.termsVersion,
      privacyVersion: user.privacyVersion,
    };
  }

  private async issueToken(
    userId: string,
    type: EmailTokenType,
    targetEmail?: string,
  ) {
    const rawToken = randomBytes(32).toString("base64url");
    await this.repository.createToken({
      userId,
      type,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + TOKEN_TTL[type]),
      targetEmail,
    });
    return rawToken;
  }
}
