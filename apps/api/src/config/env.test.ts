import { describe, expect, it } from "vitest";
import { parseEnv } from "./env.js";

const requiredEnvironment = {
  DATABASE_URL: "postgresql://localhost:5432/al_ahmadi",
  DIRECT_URL: "postgresql://localhost:5432/al_ahmadi",
  REDIS_URL: "redis://localhost:6379",
  JWT_ACCESS_SECRET: "test-secret-with-more-than-thirty-two-bytes",
  WEB_REVALIDATION_SECRET: "test-revalidation-secret-with-more-than-32-bytes",
  WEB_REVALIDATION_URL: "http://localhost:3000/api/revalidate",
  RESEND_API_KEY: "re_test-key",
  EMAIL_FROM: "Al-ahmadi <no-reply@example.com>",
};

describe("media environment configuration", () => {
  it("allows media storage to be unset for local development", () => {
    const config = parseEnv({
      ...requiredEnvironment,
      NODE_ENV: "development",
      CLOUDINARY_CLOUD_NAME: "",
      CLOUDINARY_API_KEY: "",
      CLOUDINARY_API_SECRET: "",
      MEDIA_MAX_IMAGE_BYTES: "2097152",
    });

    expect(config.CLOUDINARY_CLOUD_NAME).toBeUndefined();
    expect(config.MEDIA_MAX_IMAGE_BYTES).toBe(2 * 1024 * 1024);
    expect(config.MEDIA_MAX_IMAGE_PIXELS).toBe(40_000_000);
  });

  it("requires complete Cloudinary credentials in production", () => {
    expect(() =>
      parseEnv({ ...requiredEnvironment, NODE_ENV: "production" }),
    ).toThrow(/CLOUDINARY_CLOUD_NAME/);

    expect(() =>
      parseEnv({
        ...requiredEnvironment,
        NODE_ENV: "production",
        CLOUDINARY_CLOUD_NAME: "test-cloud",
      }),
    ).toThrow(/CLOUDINARY_CLOUD_NAME/);
  });

  it("accepts complete production credentials and validates cloud names", () => {
    const config = parseEnv({
      ...requiredEnvironment,
      NODE_ENV: "production",
      EMAIL_FROM: "Al-ahmadi <no-reply@real-domain.test>",
      WEB_BASE_URL: "https://real-domain.test",
      CLOUDINARY_CLOUD_NAME: "test-cloud",
      CLOUDINARY_API_KEY: "123456789",
      CLOUDINARY_API_SECRET: "cloudinary-secret",
    });
    expect(config.CLOUDINARY_CLOUD_NAME).toBe("test-cloud");

    expect(() =>
      parseEnv({
        ...requiredEnvironment,
        NODE_ENV: "production",
        EMAIL_FROM: "Al-ahmadi <no-reply@example.com>",
        WEB_BASE_URL: "http://localhost:3000",
        CLOUDINARY_CLOUD_NAME: "test-cloud",
        CLOUDINARY_API_KEY: "123456789",
        CLOUDINARY_API_SECRET: "cloudinary-secret",
      }),
    ).toThrow(/EMAIL_FROM|WEB_BASE_URL/);

    expect(() =>
      parseEnv({
        ...requiredEnvironment,
        CLOUDINARY_CLOUD_NAME: "https://malicious.test",
        CLOUDINARY_API_KEY: "123456789",
        CLOUDINARY_API_SECRET: "cloudinary-secret",
      }),
    ).toThrow(/CLOUDINARY_CLOUD_NAME/);
  });
});
