import { z } from "zod";

const optionalEnvString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url().optional(),
    REDIS_URL: z.string().url(),
    CORS_ORIGIN: z.string().url().default("http://localhost:3000"),
    JWT_ACCESS_SECRET: z.string().min(32),
    WEB_REVALIDATION_URL: z.string().url(),
    WEB_REVALIDATION_SECRET: z.string().min(32),
    WEB_BASE_URL: z.string().url().default("http://localhost:3000"),
    RESEND_API_KEY: optionalEnvString,
    EMAIL_FROM: optionalEnvString,
    CLOUDINARY_CLOUD_NAME: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z
        .string()
        .regex(/^[a-z0-9_-]+$/)
        .optional(),
    ),
    CLOUDINARY_API_KEY: optionalEnvString,
    CLOUDINARY_API_SECRET: optionalEnvString,
    MEDIA_MAX_IMAGE_BYTES: z.coerce
      .number()
      .int()
      .min(1024)
      .max(25 * 1024 * 1024)
      .default(10 * 1024 * 1024),
    MEDIA_MAX_IMAGE_PIXELS: z.coerce
      .number()
      .int()
      .min(1_000_000)
      .max(100_000_000)
      .default(40_000_000),
    MEDIA_MAX_PER_LISTING: z.coerce.number().int().min(1).max(100).default(20),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(600)
      .max(900)
      .default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(7).max(30).default(30),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  })
  .superRefine((env, context) => {
    const cloudinaryValues = [
      env.CLOUDINARY_CLOUD_NAME,
      env.CLOUDINARY_API_KEY,
      env.CLOUDINARY_API_SECRET,
    ];
    const configured = cloudinaryValues.filter(Boolean).length;

    if (configured !== 0 && configured !== cloudinaryValues.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CLOUDINARY_CLOUD_NAME"],
        message:
          "Cloudinary cloud name, API key, and API secret must be set together.",
      });
    }

    if (env.NODE_ENV === "production" && configured === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CLOUDINARY_CLOUD_NAME"],
        message: "Cloudinary configuration is required in production.",
      });
    }

    if (env.NODE_ENV === "production" && !env.RESEND_API_KEY) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["RESEND_API_KEY"],
        message: "RESEND_API_KEY is required in production.",
      });
    }

    if (env.NODE_ENV === "production" && !env.EMAIL_FROM) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["EMAIL_FROM"],
        message: "EMAIL_FROM is required in production.",
      });
    } else if (
      env.NODE_ENV === "production" &&
      env.EMAIL_FROM?.includes("@example.com")
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["EMAIL_FROM"],
        message: "EMAIL_FROM must use a verified sender domain.",
      });
    }

    if (
      env.NODE_ENV === "production" &&
      !env.WEB_BASE_URL.startsWith("https://")
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["WEB_BASE_URL"],
        message: "WEB_BASE_URL must use HTTPS in production.",
      });
    }
  });

export type ApiEnv = z.infer<typeof envSchema>;

export function parseEnv(environment: NodeJS.ProcessEnv): ApiEnv {
  const result = envSchema.safeParse(environment);

  if (!result.success) {
    const fields = result.error.flatten().fieldErrors;
    throw new Error(
      `Invalid API environment configuration: ${JSON.stringify(fields)}`,
    );
  }

  return result.data;
}
