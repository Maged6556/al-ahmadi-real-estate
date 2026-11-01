import { z } from "zod";
import { localeSchema } from "@al-ahmadi/shared";

const passwordSchema = z
  .string()
  .min(10)
  .refine(
    (password) => Buffer.byteLength(password, "utf8") <= 72,
    "Password must not exceed 72 UTF-8 bytes",
  );

export const registerSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(320)
      .transform((email) => email.toLowerCase()),
    password: passwordSchema,
    name: z.string().trim().min(1).max(120).optional(),
    preferredLocale: localeSchema.default("ar"),
    termsAccepted: z.literal(true),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(320)
      .transform((email) => email.toLowerCase()),
    password: z
      .string()
      .min(1)
      .refine(
        (password) => Buffer.byteLength(password, "utf8") <= 72,
        "Password must not exceed 72 UTF-8 bytes",
      ),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
