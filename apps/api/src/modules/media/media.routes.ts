import express from "express";
import { Router } from "express";
import type { Request } from "express";
import type { ApiEnv } from "../../config/env.js";
import { AppError } from "../../lib/app-error.js";
import { revalidateWebsite } from "../../lib/web-revalidation.js";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { requireCsrfHeaders } from "../../middleware/csrf.js";
import type { AuthService } from "../auth/auth.service.js";
import type { MediaRepository } from "./media.repository.js";
import type { StorageProvider } from "./storage-provider.js";
import {
  createUploadGrantSchema,
  mediaIdParamsSchema,
  reorderMediaSchema,
  supportedImageMimeSchema,
  videoLinkSchema,
} from "./media.schemas.js";
import { MediaService } from "./media.service.js";

function actorIdFrom(request: Request) {
  if (!request.authUser) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
  }
  return request.authUser.id;
}

function requestIp(request: Request) {
  return (request.ip ?? request.socket.remoteAddress ?? "").slice(0, 64);
}

export function createMediaRouter(
  repository: MediaRepository,
  authService: AuthService,
  env: Pick<
    ApiEnv,
    | "CORS_ORIGIN"
    | "WEB_REVALIDATION_URL"
    | "WEB_REVALIDATION_SECRET"
    | "CLOUDINARY_CLOUD_NAME"
    | "CLOUDINARY_API_KEY"
    | "CLOUDINARY_API_SECRET"
    | "MEDIA_MAX_IMAGE_BYTES"
    | "MEDIA_MAX_IMAGE_PIXELS"
    | "MEDIA_MAX_PER_LISTING"
  >,
  storage?: StorageProvider,
) {
  const router = Router();
  const service = new MediaService(repository, storage ?? null, {
    maxImageBytes: env.MEDIA_MAX_IMAGE_BYTES,
    maxImagePixels: env.MEDIA_MAX_IMAGE_PIXELS,
    maxMediaPerListing: env.MEDIA_MAX_PER_LISTING,
  });
  const authenticate = requireAuth(authService);
  const authorizeMedia = requirePermission("media:write");
  const csrf = requireCsrfHeaders(env.CORS_ORIGIN);

  router.use((_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    next();
  });

  router.post(
    "/sign",
    authenticate,
    authorizeMedia,
    csrf,
    async (request, response) => {
      if (!storage) {
        throw new AppError(
          503,
          "MEDIA_STORAGE_UNAVAILABLE",
          "Media storage is not configured.",
        );
      }
      const input = createUploadGrantSchema.parse(request.body);
      const result = await service.createUploadGrant({
        listingId: input.listingId,
        mimeType: input.contentType,
        actorId: actorIdFrom(request),
      });
      response.status(201).json(result);
    },
  );

  router.post(
    "/video-link",
    authenticate,
    authorizeMedia,
    csrf,
    async (request, response) => {
      const input = videoLinkSchema.parse(request.body);
      const media = await repository.createVideoLink({
        listingId: input.listingId,
        actorId: actorIdFrom(request),
        ip: requestIp(request),
        url: input.url,
        maxMediaPerListing: env.MEDIA_MAX_PER_LISTING,
      });
      if (!media) {
        throw new AppError(
          404,
          "NOT_FOUND",
          "The requested resource was not found.",
        );
      }
      const listing = await repository.findActiveListing(input.listingId);
      await revalidateWebsite(
        env.WEB_REVALIDATION_URL,
        env.WEB_REVALIDATION_SECRET,
        listing?.slug,
      );
      response.status(201).json({ data: media });
    },
  );

  router.post(
    "/",
    authenticate,
    authorizeMedia,
    csrf,
    (request, response, next) => {
      if (request.get("content-type") !== "application/octet-stream") {
        next(
          new AppError(
            415,
            "UNSUPPORTED_MEDIA_TYPE",
            "Upload the file body as application/octet-stream.",
          ),
        );
        return;
      }
      next();
    },
    express.raw({
      type: "application/octet-stream",
      limit: env.MEDIA_MAX_IMAGE_BYTES,
    }),
    async (request, response) => {
      if (!storage) {
        throw new AppError(
          503,
          "MEDIA_STORAGE_UNAVAILABLE",
          "Media storage is not configured.",
        );
      }
      const token = request.get("x-upload-token");
      const contentType = request.get("x-upload-content-type");
      if (!supportedImageMimeSchema.safeParse(contentType).success) {
        throw new AppError(
          400,
          "INVALID_IMAGE",
          "Upload a valid JPEG, PNG, or WebP image.",
        );
      }
      const result = await service.uploadImage({
        token: token ?? "",
        actorId: actorIdFrom(request),
        claimedMime: contentType,
        body: Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0),
        ip: requestIp(request),
      });
      await revalidateWebsite(
        env.WEB_REVALIDATION_URL,
        env.WEB_REVALIDATION_SECRET,
        result.listingSlug,
      );
      response.status(201).json({ data: result.data });
    },
  );

  router.patch(
    "/reorder",
    authenticate,
    authorizeMedia,
    csrf,
    async (request, response) => {
      const input = reorderMediaSchema.parse(request.body);
      const result = await service.reorder(
        input,
        actorIdFrom(request),
        requestIp(request),
      );
      await revalidateWebsite(
        env.WEB_REVALIDATION_URL,
        env.WEB_REVALIDATION_SECRET,
        result.listingSlug,
      );
      response.status(200).json({ data: result.data });
    },
  );

  router.delete(
    "/:id",
    authenticate,
    authorizeMedia,
    csrf,
    async (request, response) => {
      const { id } = mediaIdParamsSchema.parse(request.params);
      const result = await service.deleteMedia(
        id,
        actorIdFrom(request),
        requestIp(request),
      );
      await revalidateWebsite(
        env.WEB_REVALIDATION_URL,
        env.WEB_REVALIDATION_SECRET,
        result.listingSlug,
      );
      response.status(200).json({ data: result.data });
    },
  );

  return router;
}
