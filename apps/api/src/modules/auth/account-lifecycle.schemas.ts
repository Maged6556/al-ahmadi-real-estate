import { z } from "zod";
import { localeSchema } from "@al-ahmadi/shared";

const passwordSchema = z
  .string()
  .min(10)
  .refine(
    (password) => Buffer.byteLength(password, "utf8") <= 72,
    "Password must not exceed 72 UTF-8 bytes",
  );

export const resetRequestSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(320)
      .transform((email) => email.toLowerCase()),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    password: passwordSchema,
  })
  .strict();

export const verifyEmailSchema = z
  .object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })
  .strict();

export const accountProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .max(120)
      .transform((name) => name || null)
      .nullable(),
    preferredLocale: localeSchema,
  })
  .strict();

export const changeEmailSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(320)
      .transform((email) => email.toLowerCase()),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1)
      .refine(
        (password) => Buffer.byteLength(password, "utf8") <= 72,
        "Password must not exceed 72 UTF-8 bytes",
      ),
    newPassword: passwordSchema,
  })
  .strict()
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ["newPassword"],
    message: "New password must be different.",
  });

export const deleteAccountSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1)
      .refine(
        (password) => Buffer.byteLength(password, "utf8") <= 72,
        "Password must not exceed 72 UTF-8 bytes",
      ),
  })
  .strict();
