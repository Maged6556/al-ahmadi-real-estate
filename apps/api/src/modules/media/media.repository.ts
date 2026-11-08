import { randomUUID } from "node:crypto";
import { MediaKind, Prisma, type PrismaClient } from "@prisma/client";
import { AppError } from "../../lib/app-error.js";
import { prisma } from "../../lib/prisma.js";
import type { ReorderMediaInput, SupportedImageMime } from "./media.schemas.js";

export type MediaRecord = {
  id: string;
  listingId: string;
  kind: MediaKind;
  url: string;
  publicId: string;
  width: number | null;
  height: number | null;
  sortOrder: number;
  isCover: boolean;
  altAr: string | null;
  altEn: string | null;
  createdAt: Date;
};

export type ConsumedUploadGrant = {
  id: string;
  listingId: string;
  listingSlug: string;
};

export interface MediaRepository {
  findActiveListing(
    listingId: string,
  ): Promise<{ id: string; slug: string; mediaCount: number } | null>;
  createUploadGrant(input: {
    listingId: string;
    actorId: string;
    tokenHash: string;
    mimeType: SupportedImageMime;
    expiresAt: Date;
  }): Promise<void>;
  consumeUploadGrant(input: {
    tokenHash: string;
    actorId: string;
    mimeType: SupportedImageMime;
    now: Date;
  }): Promise<ConsumedUploadGrant | null>;
  createImage(input: {
    listingId: string;
    actorId: string;
    ip: string;
    url: string;
    publicId: string;
    width: number;
    height: number;
    maxMediaPerListing: number;
  }): Promise<MediaRecord>;
  createVideoLink(input: {
    listingId: string;
    actorId: string;
    ip: string;
    url: string;
    maxMediaPerListing: number;
  }): Promise<MediaRecord | null>;
  findMediaById(
    id: string,
  ): Promise<(MediaRecord & { listing: { slug: string } }) | null>;
  deleteMedia(id: string, actorId: string, ip: string): Promise<boolean>;
  reorderMedia(
    input: ReorderMediaInput,
    actorId: string,
    ip: string,
  ): Promise<MediaRecord[] | null>;
}

const mediaSelect = {
  id: true,
  listingId: true,
  kind: true,
  url: true,
  publicId: true,
  width: true,
  height: true,
  sortOrder: true,
  isCover: true,
  altAr: true,
  altEn: true,
  createdAt: true,
} satisfies Prisma.MediaSelect;

function mediaRecord(
  media: Prisma.MediaGetPayload<{ select: typeof mediaSelect }>,
): MediaRecord {
  return media;
}

export function createMediaRepository(client: PrismaClient): MediaRepository {
  return {
    async findActiveListing(listingId) {
      const listing = await client.listing.findFirst({
        where: { id: listingId, deletedAt: null },
        select: { id: true, slug: true, _count: { select: { media: true } } },
      });
      return listing
        ? {
            id: listing.id,
            slug: listing.slug,
            mediaCount: listing._count.media,
          }
        : null;
    },

    async createUploadGrant(input) {
      await client.$transaction(async (transaction) => {
        await transaction.mediaUploadGrant.deleteMany({
          where: { expiresAt: { lte: new Date() } },
        });
        await transaction.mediaUploadGrant.create({
          data: input,
          select: { id: true },
        });
      });
    },

    async consumeUploadGrant(input) {
      return client.$transaction(async (transaction) => {
        const grant = await transaction.mediaUploadGrant.findUnique({
          where: { tokenHash: input.tokenHash },
          select: {
            id: true,
            listingId: true,
            actorId: true,
            mimeType: true,
            expiresAt: true,
            consumedAt: true,
            listing: { select: { deletedAt: true, slug: true } },
          },
        });
        if (
          !grant ||
          grant.actorId !== input.actorId ||
          grant.mimeType !== input.mimeType ||
          grant.expiresAt <= input.now ||
          grant.consumedAt !== null ||
          grant.listing.deletedAt !== null
        ) {
          return null;
        }

        const consumed = await transaction.mediaUploadGrant.updateMany({
          where: {
            id: grant.id,
            actorId: input.actorId,
            tokenHash: input.tokenHash,
            mimeType: input.mimeType,
            expiresAt: { gt: input.now },
            consumedAt: null,
          },
          data: { consumedAt: input.now },
        });
        return consumed.count === 1
          ? {
              id: grant.id,
              listingId: grant.listingId,
              listingSlug: grant.listing.slug,
            }
          : null;
      });
    },

    async createImage(input) {
      return client.$transaction(async (transaction) => {
        await transaction.$queryRaw(
          Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${input.listingId}))::text AS lock`,
        );
        const listing = await transaction.listing.findFirst({
          where: { id: input.listingId, deletedAt: null },
          select: { id: true, slug: true },
        });
        if (!listing) {
          throw new AppError(
            404,
            "NOT_FOUND",
            "The requested resource was not found.",
          );
        }

        const current = await transaction.media.aggregate({
          where: { listingId: input.listingId },
          _count: { _all: true },
          _max: { sortOrder: true },
        });
        const imageCount = await transaction.media.count({
          where: { listingId: input.listingId, kind: MediaKind.IMAGE },
        });
        if (current._count._all >= input.maxMediaPerListing) {
          throw new AppError(
            409,
            "MEDIA_LIMIT_REACHED",
            "A listing can have at most 20 media items.",
          );
        }

        const media = await transaction.media.create({
          data: {
            listingId: input.listingId,
            kind: MediaKind.IMAGE,
            url: input.url,
            publicId: input.publicId,
            width: input.width,
            height: input.height,
            sortOrder: (current._max.sortOrder ?? -1) + 1,
            isCover: imageCount === 0,
          },
          select: mediaSelect,
        });
        await transaction.auditLog.create({
          data: {
            actorId: input.actorId,
            action: "LISTING_MEDIA_UPLOADED",
            entity: "media",
            entityId: media.id,
            diff: { listingId: input.listingId, kind: "image" },
            ip: input.ip,
          },
        });
        return mediaRecord(media);
      });
    },

    async createVideoLink(input) {
      return client.$transaction(async (transaction) => {
        await transaction.$queryRaw(
          Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${input.listingId}))::text AS lock`,
        );
        const listing = await transaction.listing.findFirst({
          where: { id: input.listingId, deletedAt: null },
          select: { id: true },
        });
        if (!listing) return null;

        const current = await transaction.media.aggregate({
          where: { listingId: input.listingId },
          _count: { _all: true },
          _max: { sortOrder: true },
        });
        if (current._count._all >= input.maxMediaPerListing) {
          throw new AppError(
            409,
            "MEDIA_LIMIT_REACHED",
            "A listing can have at most 20 media items.",
          );
        }

        const media = await transaction.media.create({
          data: {
            listingId: input.listingId,
            kind: MediaKind.VIDEO,
            url: input.url,
            publicId: `external-video:${randomUUID()}`,
            sortOrder: (current._max.sortOrder ?? -1) + 1,
            isCover: false,
          },
          select: mediaSelect,
        });
        await transaction.auditLog.create({
          data: {
            actorId: input.actorId,
            action: "LISTING_VIDEO_LINKED",
            entity: "media",
            entityId: media.id,
            diff: {
              listingId: input.listingId,
              host: new URL(input.url).host,
            },
            ip: input.ip,
          },
        });
        return mediaRecord(media);
      });
    },

    findMediaById(id) {
      return client.media.findFirst({
        where: { id },
        select: { ...mediaSelect, listing: { select: { slug: true } } },
      });
    },

    async deleteMedia(id, actorId, ip) {
      return client.$transaction(async (transaction) => {
        const existing = await transaction.media.findUnique({
          where: { id },
          select: { id: true, listingId: true, isCover: true },
        });
        if (!existing) return false;

        await transaction.media.delete({ where: { id } });
        if (existing.isCover) {
          const nextCover = await transaction.media.findFirst({
            where: {
              listingId: existing.listingId,
              kind: MediaKind.IMAGE,
            },
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
            select: { id: true },
          });
          if (nextCover) {
            await transaction.media.update({
              where: { id: nextCover.id },
              data: { isCover: true },
              select: { id: true },
            });
          }
        }

        await transaction.auditLog.create({
          data: {
            actorId,
            action: "LISTING_MEDIA_DELETED",
            entity: "media",
            entityId: id,
            diff: { listingId: existing.listingId },
            ip,
          },
        });
        return true;
      });
    },

    async reorderMedia(input, actorId, ip) {
      return client.$transaction(async (transaction) => {
        const listing = await transaction.listing.findFirst({
          where: { id: input.listingId, deletedAt: null },
          select: { id: true },
        });
        if (!listing) return null;

        const existing = await transaction.media.findMany({
          where: { listingId: input.listingId },
          select: { id: true, kind: true },
        });
        const imageCount = existing.filter(
          (item) => item.kind === MediaKind.IMAGE,
        ).length;
        const coverCount = input.media.filter((item) => item.isCover).length;
        if (
          existing.length !== input.media.length ||
          !input.media.every(({ id }) =>
            existing.some((item) => item.id === id),
          ) ||
          input.media.some(
            ({ id, isCover }) =>
              isCover &&
              existing.find((item) => item.id === id)?.kind !== MediaKind.IMAGE,
          ) ||
          (imageCount > 0 && coverCount !== 1) ||
          (imageCount === 0 && coverCount !== 0)
        ) {
          return null;
        }

        await transaction.media.updateMany({
          where: { listingId: input.listingId },
          data: { isCover: false },
        });

        for (const item of input.media) {
          await transaction.media.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder, isCover: item.isCover },
            select: { id: true },
          });
        }

        await transaction.auditLog.create({
          data: {
            actorId,
            action: "LISTING_MEDIA_REORDERED",
            entity: "listing",
            entityId: input.listingId,
            diff: {
              media: input.media.map(({ id, sortOrder, isCover }) => ({
                id,
                sortOrder,
                isCover,
              })),
            },
            ip,
          },
        });

        return transaction.media.findMany({
          where: { listingId: input.listingId },
          select: mediaSelect,
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        });
      });
    },
  };
}

export const mediaRepository = createMediaRepository(prisma);
