import { createHash } from "node:crypto";
import { AppError } from "../../lib/app-error.js";
import type { StorageProvider } from "./storage-provider.js";

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export function signParameters(
  parameters: Record<string, string>,
  apiSecret: string,
) {
  const canonical = Object.entries(parameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  // Cloudinary's upload API requires SHA-1 for request signatures. This is
  // protocol authentication, not password or token hashing.
  // codeql[js/weak-cryptographic-algorithm]
  return createHash("sha1").update(`${canonical}${apiSecret}`).digest("hex");
}

function isCloudinaryUrl(url: string, cloudName: string) {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      parsed.pathname.startsWith(`/${cloudName}/image/upload/`)
    );
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class CloudinaryStorage implements StorageProvider {
  constructor(private readonly config: CloudinaryConfig) {}

  async uploadImage(input: { publicId: string; buffer: Buffer }) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signedParameters = {
      public_id: input.publicId,
      timestamp,
    };
    const form = new FormData();
    form.set("api_key", this.config.apiKey);
    form.set("public_id", input.publicId);
    form.set("timestamp", timestamp);
    form.set(
      "signature",
      signParameters(signedParameters, this.config.apiSecret),
    );
    form.set(
      "file",
      new Blob([Uint8Array.from(input.buffer)], { type: "image/webp" }),
      `${input.publicId.split("/").at(-1)}.webp`,
    );

    let response: Response;
    try {
      response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.config.cloudName}/image/upload`,
        {
          method: "POST",
          body: form,
          signal: AbortSignal.timeout(20_000),
        },
      );
    } catch {
      throw new AppError(
        502,
        "MEDIA_STORAGE_UNAVAILABLE",
        "Media storage is temporarily unavailable.",
      );
    }

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok || !isRecord(payload)) {
      throw new AppError(
        502,
        "MEDIA_STORAGE_FAILED",
        "The image could not be stored.",
      );
    }

    const result = payload;
    if (
      result.public_id !== input.publicId ||
      typeof result.secure_url !== "string" ||
      !isCloudinaryUrl(result.secure_url, this.config.cloudName) ||
      result.format !== "webp" ||
      typeof result.width !== "number" ||
      typeof result.height !== "number" ||
      !Number.isInteger(result.width) ||
      !Number.isInteger(result.height)
    ) {
      throw new AppError(
        502,
        "MEDIA_STORAGE_INVALID_RESPONSE",
        "Media storage returned an invalid image response.",
      );
    }

    return {
      publicId: input.publicId,
      url: result.secure_url,
      width: result.width,
      height: result.height,
    };
  }

  async deleteImage(publicId: string) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signedParameters = {
      invalidate: "true",
      public_id: publicId,
      timestamp,
    };
    const form = new FormData();
    form.set("api_key", this.config.apiKey);
    form.set("public_id", publicId);
    form.set("timestamp", timestamp);
    form.set("invalidate", "true");
    form.set(
      "signature",
      signParameters(signedParameters, this.config.apiSecret),
    );

    let response: Response;
    try {
      response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.config.cloudName}/image/destroy`,
        {
          method: "POST",
          body: form,
          signal: AbortSignal.timeout(10_000),
        },
      );
    } catch {
      throw new AppError(
        502,
        "MEDIA_STORAGE_UNAVAILABLE",
        "Media storage is temporarily unavailable.",
      );
    }

    const payload: unknown = await response.json().catch(() => null);
    if (
      !response.ok ||
      !isRecord(payload) ||
      !["ok", "not found"].includes(String(payload.result))
    ) {
      throw new AppError(
        502,
        "MEDIA_STORAGE_DELETE_FAILED",
        "The image could not be removed from media storage.",
      );
    }
  }
}
