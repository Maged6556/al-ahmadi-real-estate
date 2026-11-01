import {
  ListingOffer,
  ListingStatus,
  ListingType,
  Prisma,
  type PrismaClient,
} from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

const listingSelect = {
  id: true,
  code: true,
  slug: true,
  type: true,
  offer: true,
  status: true,
  titleAr: true,
  titleEn: true,
  descriptionAr: true,
  descriptionEn: true,
  city: true,
  district: true,
  addressText: true,
  latitude: true,
  longitude: true,
  areaSqm: true,
  bedrooms: true,
  bathrooms: true,
  floor: true,
  features: true,
  isPublished: true,
  publishedAt: true,
  soldAt: true,
  rentedAt: true,
  createdAt: true,
  updatedAt: true,
  media: {
    select: {
      id: true,
      kind: true,
      url: true,
      width: true,
      height: true,
      sortOrder: true,
      isCover: true,
      altAr: true,
      altEn: true,
    },
    orderBy: { sortOrder: "asc" },
  },
} satisfies Prisma.ListingSelect;

export type ListingRecord = Prisma.ListingGetPayload<{
  select: typeof listingSelect;
}>;

export type ListingRepository = {
  findPublicPage(input: {
    where: Prisma.ListingWhereInput;
    skip: number;
    take: number;
  }): Promise<ListingRecord[]>;
  countPublic(where: Prisma.ListingWhereInput): Promise<number>;
  countPublicByType(
    where: Prisma.ListingWhereInput,
  ): Promise<{ type: ListingType; count: number }[]>;
  countPublicByOffer(
    where: Prisma.ListingWhereInput,
  ): Promise<{ offer: ListingOffer; count: number }[]>;
  findPublicBySlug(slug: string): Promise<ListingRecord | null>;
  findPublicFilterOptions(): Promise<
    { city: string; district: string | null }[]
  >;
  findAdminPage(input: {
    where: Prisma.ListingWhereInput;
    skip: number;
    take: number;
  }): Promise<ListingRecord[]>;
  countAdmin(where: Prisma.ListingWhereInput): Promise<number>;
  findAdminById(id: string): Promise<ListingRecord | null>;
  create(
    input: Prisma.ListingCreateInput,
    actorId: string,
    ip: string,
  ): Promise<ListingRecord>;
  update(
    id: string,
    input: Prisma.ListingUpdateInput,
    changedKeys: string[],
    actorId: string,
    ip: string,
  ): Promise<ListingRecord | null>;
  updateStatus(
    id: string,
    status: ListingStatus,
    actorId: string,
    ip: string,
  ): Promise<ListingRecord | null>;
  setPublished(
    id: string,
    published: boolean,
    actorId: string,
    ip: string,
  ): Promise<ListingRecord | null>;
  softDelete(id: string, actorId: string, ip: string): Promise<boolean>;
};

function publicWhere(
  where: Prisma.ListingWhereInput,
): Prisma.ListingWhereInput {
  return { AND: [where, { isPublished: true, deletedAt: null }] };
}

function auditDiff(changedKeys: string[]): Prisma.InputJsonObject {
  return { changedKeys };
}

export function createListingsRepository(
  client: PrismaClient,
): ListingRepository {
  return {
    findPublicPage({ where, skip, take }) {
      return client.listing.findMany({
        where: publicWhere(where),
        select: listingSelect,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take,
      });
    },

    countPublic(where) {
      return client.listing.count({ where: publicWhere(where) });
    },

    async countPublicByType(where) {
      const groups = await client.listing.groupBy({
        by: ["type"],
        where: publicWhere(where),
        _count: { _all: true },
      });
      return groups.map(({ type, _count }) => ({
        type,
        count: _count._all,
      }));
    },

    async countPublicByOffer(where) {
      const groups = await client.listing.groupBy({
        by: ["offer"],
        where: publicWhere(where),
        _count: { _all: true },
      });
      return groups.map(({ offer, _count }) => ({
        offer,
        count: _count._all,
      }));
    },

    findPublicBySlug(slug) {
      return client.listing.findFirst({
        where: { slug, isPublished: true, deletedAt: null },
        select: listingSelect,
      });
    },

    findPublicFilterOptions() {
      return client.listing.findMany({
        where: { isPublished: true, deletedAt: null },
        select: { city: true, district: true },
        distinct: ["city", "district"],
        orderBy: [{ city: "asc" }, { district: "asc" }],
      });
    },

    findAdminPage({ where, skip, take }) {
      return client.listing.findMany({
        where: { AND: [where, { deletedAt: null }] },
        select: listingSelect,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take,
      });
    },

    countAdmin(where) {
      return client.listing.count({
        where: { AND: [where, { deletedAt: null }] },
      });
    },

    findAdminById(id) {
      return client.listing.findFirst({
        where: { id, deletedAt: null },
        select: listingSelect,
      });
    },

    async create(input, actorId, ip) {
      return client.$transaction(async (transaction) => {
        const listing = await transaction.listing.create({
          data: input,
          select: listingSelect,
        });
        await transaction.auditLog.create({
          data: {
            actorId,
            action: "LISTING_CREATED",
            entity: "listing",
            entityId: listing.id,
            diff: auditDiff(Object.keys(input)),
            ip,
          },
        });
        return listing;
      });
    },

    async update(id, input, changedKeys, actorId, ip) {
      return client.$transaction(async (transaction) => {
        const updated = await transaction.listing.updateMany({
          where: { id, deletedAt: null },
          data: input,
        });
        if (updated.count !== 1) {
          return null;
        }

        const listing = await transaction.listing.findUniqueOrThrow({
          where: { id },
          select: listingSelect,
        });
        await transaction.auditLog.create({
          data: {
            actorId,
            action: "LISTING_UPDATED",
            entity: "listing",
            entityId: id,
            diff: auditDiff(changedKeys),
            ip,
          },
        });
        return listing;
      });
    },

    async updateStatus(id, status, actorId, ip) {
      return client.$transaction(async (transaction) => {
        const now = new Date();
        const updated = await transaction.listing.updateMany({
          where: { id, deletedAt: null },
          data: {
            status,
            soldAt: status === ListingStatus.SOLD ? now : null,
            rentedAt: status === ListingStatus.RENTED ? now : null,
          },
        });
        if (updated.count !== 1) {
          return null;
        }

        const listing = await transaction.listing.findUniqueOrThrow({
          where: { id },
          select: listingSelect,
        });
        await transaction.auditLog.create({
          data: {
            actorId,
            action: "LISTING_STATUS_CHANGED",
            entity: "listing",
            entityId: id,
            diff: { status },
            ip,
          },
        });
        return listing;
      });
    },

    async setPublished(id, published, actorId, ip) {
      return client.$transaction(async (transaction) => {
        const updated = await transaction.listing.updateMany({
          where: { id, deletedAt: null },
          data: {
            isPublished: published,
            publishedAt: published ? new Date() : null,
          },
        });
        if (updated.count !== 1) {
          return null;
        }

        const listing = await transaction.listing.findUniqueOrThrow({
          where: { id },
          select: listingSelect,
        });
        await transaction.auditLog.create({
          data: {
            actorId,
            action: published ? "LISTING_PUBLISHED" : "LISTING_UNPUBLISHED",
            entity: "listing",
            entityId: id,
            diff: { isPublished: published },
            ip,
          },
        });
        return listing;
      });
    },

    async softDelete(id, actorId, ip) {
      return client.$transaction(async (transaction) => {
        const deletedAt = new Date();
        const updated = await transaction.listing.updateMany({
          where: { id, deletedAt: null },
          data: { deletedAt, isPublished: false, publishedAt: null },
        });
        if (updated.count !== 1) {
          return false;
        }

        await transaction.auditLog.create({
          data: {
            actorId,
            action: "LISTING_DELETED",
            entity: "listing",
            entityId: id,
            diff: { deletedAt: deletedAt.toISOString() },
            ip,
          },
        });
        return true;
      });
    },
  };
}

export const listingsRepository = createListingsRepository(prisma);
