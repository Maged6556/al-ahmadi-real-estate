import { createHash, randomBytes, randomUUID } from "node:crypto";
import sharp from "sharp";
import { AppError } from "../../lib/app-error.js";
import type { StorageProvider } from "./storage-provider.js";
import type {
  ConsumedUploadGrant,
  MediaRecord,
  MediaRepository,
} from "./media.repository.js";
import type { ReorderMediaInput, SupportedImageMime } from "./media.schemas.js";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_LISTING_MEDIA = 20;
const UPLOAD_GRANT_TTL_MS = 5 * 60 * 1000;
const MAX_IMAGE_PIXELS = 40_000_000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function invalidImage() {
  return new AppError(
    400,
    "INVALID_IMAGE",
    "Upload a valid JPEG, PNG, or WebP image within the size limit.",
  );
}

export function detectImageMime(buffer: Buffer): SupportedImageMime | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

export type SanitizedImage = {
  buffer: Buffer;
  width: number;
  height: number;
};

export async function sanitizeImage(
  buffer: Buffer,
  claimedMime: string | undefined,
  maxImageBytes = MAX_IMAGE_BYTES,
  maxImagePixels = MAX_IMAGE_PIXELS,
): Promise<SanitizedImage> {
  if (
    buffer.length === 0 ||
    buffer.length > maxImageBytes ||
    !claimedMime ||
    detectImageMime(buffer) !== claimedMime
  ) {
    throw invalidImage();
  }

  try {
    const image = sharp(buffer, {
      failOn: "error",
      limitInputPixels: maxImagePixels,
      animated: false,
    });
    const metadata = await image.metadata();
    if (
      metadata.width === undefined ||
      metadata.height === undefined ||
      metadata.width * metadata.height > maxImagePixels ||
      (metadata.pages !== undefined && metadata.pages > 1)
    ) {
      throw invalidImage();
    }

    const sanitized = await image
      .rotate()
      .webp({ quality: 82, effort: 5 })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: sanitized.data,
      width: sanitized.info.width,
      height: sanitized.info.height,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw invalidImage();
  }
}

export class MediaService {
  constructor(
    private readonly repository: MediaRepository,
    private readonly storage: StorageProvider | null,
    private readonly limits = {
      maxImageBytes: MAX_IMAGE_BYTES,
      maxImagePixels: MAX_IMAGE_PIXELS,
      maxMediaPerListing: MAX_LISTING_MEDIA,
    },
  ) {}

  async createUploadGrant(input: {
    listingId: string;
    actorId: string;
    mimeType: SupportedImageMime;
  }) {
    const listing = await this.repository.findActiveListing(input.listingId);
    if (!listing) {
      throw new AppError(
        404,
        "NOT_FOUND",
        "The requested resource was not found.",
      );
    }
    if (listing.mediaCount >= this.limits.maxMediaPerListing) {
      throw new AppError(
        409,
        "MEDIA_LIMIT_REACHED",
        "A listing can have at most 20 media items.",
      );
    }

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + UPLOAD_GRANT_TTL_MS);
    await this.repository.createUploadGrant({
      listingId: input.listingId,
      actorId: input.actorId,
      tokenHash: hashToken(token),
      mimeType: input.mimeType,
      expiresAt,
    });

    return {
      data: {
        uploadUrl: "/api/admin/media",
        uploadToken: token,
        contentType: "application/octet-stream",
        expectedContentType: input.mimeType,
        maxBytes: this.limits.maxImageBytes,
        expiresAt,
      },
    };
  }

  async uploadImage(input: {
    token: string;
    actorId: string;
    claimedMime: string | undefined;
    body: Buffer;
    ip: string;
  }) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(input.token)) {
      throw new AppError(
        401,
        "INVALID_UPLOAD_GRANT",
        "The upload grant is invalid or expired.",
      );
    }
    if (
      input.claimedMime !== "image/jpeg" &&
      input.claimedMime !== "image/png" &&
      input.claimedMime !== "image/webp"
    ) {
      throw invalidImage();
    }

    const grant: ConsumedUploadGrant | null =
      await this.repository.consumeUploadGrant({
        tokenHash: hashToken(input.token),
        actorId: input.actorId,
        mimeType: input.claimedMime,
        now: new Date(),
      });
    if (!grant) {
      throw new AppError(
        401,
        "INVALID_UPLOAD_GRANT",
        "The upload grant is invalid or expired.",
      );
    }

    const sanitized = await sanitizeImage(
      input.body,
      input.claimedMime,
      this.limits.maxImageBytes,
      this.limits.maxImagePixels,
    );
    const storage = this.storage;
    if (!storage) {
      throw new AppError(
        503,
        "MEDIA_STORAGE_UNAVAILABLE",
        "Media storage is not configured.",
      );
    }

    const publicId = `al-ahmadi/listings/${grant.listingId}/${randomUUID()}`;
    const stored = await storage.uploadImage({
      publicId,
      buffer: sanitized.buffer,
    });

    try {
      const media = await this.repository.createImage({
        listingId: grant.listingId,
        actorId: input.actorId,
        ip: input.ip,
        maxMediaPerListing: this.limits.maxMediaPerListing,
        ...stored,
      });
      return { data: media, listingSlug: grant.listingSlug };
    } catch (error) {
      try {
        await storage.deleteImage(stored.publicId);
      } catch {
        console.error(
          JSON.stringify({
            level: "error",
            event: "orphaned_cloudinary_media",
            publicId: stored.publicId,
          }),
        );
      }
      throw error;
    }
  }

  async deleteMedia(id: string, actorId: string, ip: string) {
    const media = await this.repository.findMediaById(id);
    if (!media) {
      throw new AppError(
        404,
        "NOT_FOUND",
        "The requested resource was not found.",
      );
    }

    const deleted = await this.repository.deleteMedia(id, actorId, ip);
    if (!deleted) {
      throw new AppError(
        404,
        "NOT_FOUND",
        "The requested resource was not found.",
      );
    }

    if (media.kind === "IMAGE") {
      if (!this.storage) {
        console.error(
          JSON.stringify({
            level: "error",
            event: "orphaned_cloudinary_media",
            publicId: media.publicId,
            reason: "storage_unavailable_during_delete",
          }),
        );
      } else {
        try {
          await this.storage.deleteImage(media.publicId);
        } catch (error) {
          console.error(
            JSON.stringify({
              level: "error",
              event: "orphaned_cloudinary_media",
              publicId: media.publicId,
              errorName: error instanceof Error ? error.name : "UnknownError",
            }),
          );
        }
      }
    }

    return { data: { id }, listingSlug: media.listing.slug };
  }

  async reorder(
    input: ReorderMediaInput,
    actorId: string,
    ip: string,
  ): Promise<{ data: MediaRecord[]; listingSlug?: string }> {
    const media = await this.repository.reorderMedia(input, actorId, ip);
    if (!media) {
      throw new AppError(
        400,
        "INVALID_MEDIA_ORDER",
        "The media list must contain every attached item exactly once and use an image as its cover.",
      );
    }
    const listing = await this.repository.findActiveListing(input.listingId);
    return { data: media, listingSlug: listing?.slug };
  }
}
