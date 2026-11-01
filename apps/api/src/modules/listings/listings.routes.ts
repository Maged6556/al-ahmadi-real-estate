import { Prisma } from "@prisma/client";
import { Router } from "express";
import type { Request } from "express";
import type { ApiEnv } from "../../config/env.js";
import { AppError } from "../../lib/app-error.js";
import { revalidateWebsite } from "../../lib/web-revalidation.js";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { requireCsrfHeaders } from "../../middleware/csrf.js";
import type { AuthService } from "../auth/auth.service.js";
import {
  adminListingQuerySchema,
  createListingSchema,
  listingIdParamsSchema,
  listingPublishBodySchema,
  listingSlugParamsSchema,
  listingStatusBodySchema,
  publicListingQuerySchema,
  updateListingSchema,
} from "./listings.schemas.js";
import type { ListingRepository } from "./listings.repository.js";
import {
  ListingsService,
  toAdminListing,
  toListingEnums,
  toListingOffer,
  toListingStatus,
  toListingType,
} from "./listings.service.js";

function actorIdFrom(request: Request) {
  if (!request.authUser) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
  }
  return request.authUser.id;
}

function requestIp(request: Request) {
  return (request.ip ?? request.socket.remoteAddress ?? "").slice(0, 64);
}

function toCreateData(input: ReturnType<typeof createListingSchema.parse>) {
  const { type, offer, ...fields } = input;
  return {
    ...fields,
    ...toListingEnums(type, offer),
  } satisfies Prisma.ListingCreateInput;
}

function toUpdateData(input: ReturnType<typeof updateListingSchema.parse>) {
  const { type, offer, ...fields } = input;
  return {
    ...fields,
    ...(type === undefined ? {} : { type: toListingType(type) }),
    ...(offer === undefined ? {} : { offer: toListingOffer(offer) }),
  } satisfies Prisma.ListingUpdateInput;
}

export function createListingsRouter(
  repository: ListingRepository,
  authService: AuthService,
  env: Pick<
    ApiEnv,
    "CORS_ORIGIN" | "WEB_REVALIDATION_URL" | "WEB_REVALIDATION_SECRET"
  >,
) {
  const router = Router();
  const service = new ListingsService(repository);
  const authenticate = requireAuth(authService);
  const listingWriter = [authenticate, requirePermission("listing:write")];
  const listingDeleter = [authenticate, requirePermission("listing:delete")];
  const csrf = requireCsrfHeaders(env.CORS_ORIGIN);

  router.use("/admin", (_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    next();
  });

  router.get("/listings", async (request, response) => {
    const filters = publicListingQuerySchema.parse(request.query);
    response.setHeader("Cache-Control", "no-store");
    response.status(200).json(await service.listPublic(filters));
  });

  router.get("/listings/:slug", async (request, response) => {
    const { slug } = listingSlugParamsSchema.parse(request.params);
    response.setHeader("Cache-Control", "no-store");
    response.status(200).json(await service.getPublic(slug));
  });

  router.get("/meta/filters", async (_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.status(200).json(await service.getFilterOptions());
  });

  router.get(
    "/admin/listings",
    authenticate,
    requirePermission("listing:write"),
    async (request, response) => {
      const filters = adminListingQuerySchema.parse(request.query);
      response.status(200).json(await service.listAdmin(filters));
    },
  );

  router.get(
    "/admin/listings/:id",
    authenticate,
    requirePermission("listing:write"),
    async (request, response) => {
      const { id } = listingIdParamsSchema.parse(request.params);
      response.status(200).json(await service.getAdmin(id));
    },
  );

  router.post(
    "/admin/listings",
    ...listingWriter,
    csrf,
    async (request, response) => {
      const input = createListingSchema.parse(request.body);
      const listing = await repository.create(
        toCreateData(input),
        actorIdFrom(request),
        requestIp(request),
      );
      await revalidateWebsite(
        env.WEB_REVALIDATION_URL,
        env.WEB_REVALIDATION_SECRET,
        listing.slug,
      );
      response.status(201).json({ data: toAdminListing(listing) });
    },
  );

  router.put(
    "/admin/listings/:id",
    ...listingWriter,
    csrf,
    async (request, response) => {
      const { id } = listingIdParamsSchema.parse(request.params);
      const input = updateListingSchema.parse(request.body);
      const previous = await repository.findAdminById(id);
      if (!previous) {
        throw new AppError(
          404,
          "NOT_FOUND",
          "The requested resource was not found.",
        );
      }

      const listing = await repository.update(
        id,
        toUpdateData(input),
        Object.keys(input),
        actorIdFrom(request),
        requestIp(request),
      );
      if (!listing) {
        throw new AppError(
          404,
          "NOT_FOUND",
          "The requested resource was not found.",
        );
      }
      await revalidateWebsite(
        env.WEB_REVALIDATION_URL,
        env.WEB_REVALIDATION_SECRET,
        previous.slug,
      );
      if (previous.slug !== listing.slug) {
        await revalidateWebsite(
          env.WEB_REVALIDATION_URL,
          env.WEB_REVALIDATION_SECRET,
          listing.slug,
        );
      }
      response.status(200).json({ data: toAdminListing(listing) });
    },
  );

  router.patch(
    "/admin/listings/:id/status",
    ...listingWriter,
    csrf,
    async (request, response) => {
      const { id } = listingIdParamsSchema.parse(request.params);
      const { status } = listingStatusBodySchema.parse(request.body);
      const listing = await repository.updateStatus(
        id,
        toListingStatus(status),
        actorIdFrom(request),
        requestIp(request),
      );
      if (!listing) {
        throw new AppError(
          404,
          "NOT_FOUND",
          "The requested resource was not found.",
        );
      }
      await revalidateWebsite(
        env.WEB_REVALIDATION_URL,
        env.WEB_REVALIDATION_SECRET,
        listing.slug,
      );
      response.status(200).json({ data: toAdminListing(listing) });
    },
  );

  router.patch(
    "/admin/listings/:id/publish",
    ...listingWriter,
    csrf,
    async (request, response) => {
      const { id } = listingIdParamsSchema.parse(request.params);
      const { isPublished } = listingPublishBodySchema.parse(request.body);
      const listing = await repository.setPublished(
        id,
        isPublished,
        actorIdFrom(request),
        requestIp(request),
      );
      if (!listing) {
        throw new AppError(
          404,
          "NOT_FOUND",
          "The requested resource was not found.",
        );
      }
      await revalidateWebsite(
        env.WEB_REVALIDATION_URL,
        env.WEB_REVALIDATION_SECRET,
        listing.slug,
      );
      response.status(200).json({ data: toAdminListing(listing) });
    },
  );

  router.delete(
    "/admin/listings/:id",
    ...listingDeleter,
    csrf,
    async (request, response) => {
      const { id } = listingIdParamsSchema.parse(request.params);
      const listing = await repository.findAdminById(id);
      if (!listing) {
        throw new AppError(
          404,
          "NOT_FOUND",
          "The requested resource was not found.",
        );
      }
      const deleted = await repository.softDelete(
        id,
        actorIdFrom(request),
        requestIp(request),
      );
      if (!deleted) {
        throw new AppError(
          404,
          "NOT_FOUND",
          "The requested resource was not found.",
        );
      }
      await revalidateWebsite(
        env.WEB_REVALIDATION_URL,
        env.WEB_REVALIDATION_SECRET,
        listing.slug,
      );
      response.status(204).end();
    },
  );

  return router;
}
