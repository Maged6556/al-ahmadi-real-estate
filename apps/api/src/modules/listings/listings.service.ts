import type { Prisma } from "@prisma/client";
import type {
  ListingOffer as PublicListingOffer,
  ListingStatus as PublicListingStatus,
  ListingType as PublicListingType,
} from "@al-ahmadi/shared";
import { AppError } from "../../lib/app-error.js";
import type {
  AdminListingQuery,
  PublicListingQuery,
} from "./listings.schemas.js";
import type {
  ListingRecord,
  ListingRepository,
} from "./listings.repository.js";

const typeToDb = {
  apartment: "APARTMENT",
  building: "BUILDING",
  residential_unit: "RESIDENTIAL_UNIT",
  villa: "VILLA",
  land: "LAND",
} as const;

const typeFromDb = {
  APARTMENT: "apartment",
  BUILDING: "building",
  RESIDENTIAL_UNIT: "residential_unit",
  VILLA: "villa",
  LAND: "land",
} as const;

const offerToDb = {
  sale: "SALE",
  rent: "RENT",
} as const;

const offerFromDb = {
  SALE: "sale",
  RENT: "rent",
} as const;

const statusToDb = {
  available: "AVAILABLE",
  sold: "SOLD",
  rented: "RENTED",
} as const;

const statusFromDb = {
  AVAILABLE: "available",
  SOLD: "sold",
  RENTED: "rented",
} as const;

export function publicListingWhere(
  filters: PublicListingQuery,
  omitFacet?: "type" | "offer",
): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = {};
  if (filters.type && omitFacet !== "type") where.type = typeToDb[filters.type];
  if (filters.offer && omitFacet !== "offer")
    where.offer = offerToDb[filters.offer];
  if (filters.status) where.status = statusToDb[filters.status];
  if (filters.city) where.city = filters.city;
  if (filters.district) where.district = filters.district;
  if (filters.q) {
    where.OR = [
      { titleAr: { contains: filters.q, mode: "insensitive" } },
      { titleEn: { contains: filters.q, mode: "insensitive" } },
      { city: { contains: filters.q, mode: "insensitive" } },
      { district: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  return where;
}

export function adminListingWhere(
  filters: AdminListingQuery,
): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = {};
  if (filters.type) where.type = typeToDb[filters.type];
  if (filters.offer) where.offer = offerToDb[filters.offer];
  if (filters.status) where.status = statusToDb[filters.status];
  if (filters.city) where.city = filters.city;
  if (filters.isPublished !== undefined)
    where.isPublished = filters.isPublished === "true";
  if (filters.q) {
    where.OR = [
      { code: { contains: filters.q, mode: "insensitive" } },
      { titleAr: { contains: filters.q, mode: "insensitive" } },
      { titleEn: { contains: filters.q, mode: "insensitive" } },
      { city: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  return where;
}

function mediaDto(record: ListingRecord) {
  return record.media.map((media) => ({
    kind: media.kind.toLowerCase(),
    url: media.url,
    width: media.width,
    height: media.height,
    sortOrder: media.sortOrder,
    isCover: media.isCover,
    altAr: media.altAr,
    altEn: media.altEn,
  }));
}

export function toPublicListing(record: ListingRecord) {
  return {
    code: record.code,
    slug: record.slug,
    type: typeFromDb[record.type],
    offer: offerFromDb[record.offer],
    status: statusFromDb[record.status],
    titleAr: record.titleAr,
    titleEn: record.titleEn,
    descriptionAr: record.descriptionAr,
    descriptionEn: record.descriptionEn,
    city: record.city,
    district: record.district,
    areaSqm: record.areaSqm?.toNumber() ?? null,
    bedrooms: record.bedrooms,
    bathrooms: record.bathrooms,
    floor: record.floor,
    features: record.features,
    publishedAt: record.publishedAt,
    media: mediaDto(record),
  };
}

export function toAdminListing(record: ListingRecord) {
  return {
    id: record.id,
    ...toPublicListing(record),
    media: record.media.map((media) => ({
      id: media.id,
      kind: media.kind.toLowerCase(),
      url: media.url,
      width: media.width,
      height: media.height,
      sortOrder: media.sortOrder,
      isCover: media.isCover,
      altAr: media.altAr,
      altEn: media.altEn,
    })),
    addressText: record.addressText,
    latitude: record.latitude?.toNumber() ?? null,
    longitude: record.longitude?.toNumber() ?? null,
    isPublished: record.isPublished,
    soldAt: record.soldAt,
    rentedAt: record.rentedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class ListingsService {
  constructor(private readonly repository: ListingRepository) {}

  async listPublic(filters: PublicListingQuery) {
    const where = publicListingWhere(filters);
    const [listings, total, typeGroups, offerGroups] = await Promise.all([
      this.repository.findPublicPage({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.repository.countPublic(where),
      this.repository.countPublicByType(publicListingWhere(filters, "type")),
      this.repository.countPublicByOffer(publicListingWhere(filters, "offer")),
    ]);

    return {
      data: listings.map(toPublicListing),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
        facets: {
          types: typeGroups.map(({ type, count }) => ({
            value: typeFromDb[type],
            count,
          })),
          offers: offerGroups.map(({ offer, count }) => ({
            value: offerFromDb[offer],
            count,
          })),
        },
      },
    };
  }

  async getPublic(slug: string) {
    const listing = await this.repository.findPublicBySlug(slug);
    if (!listing) {
      throw new AppError(
        404,
        "NOT_FOUND",
        "The requested resource was not found.",
      );
    }
    return { data: toPublicListing(listing) };
  }

  async getFilterOptions() {
    const rows = await this.repository.findPublicFilterOptions();
    return {
      data: {
        cities: [...new Set(rows.map(({ city }) => city))],
        districts: rows
          .filter(
            (row): row is { city: string; district: string } =>
              row.district !== null,
          )
          .map(({ city, district }) => ({ city, district })),
        types: Object.values(typeFromDb),
        offers: Object.values(offerFromDb),
        statuses: Object.values(statusFromDb),
      },
    };
  }

  async listAdmin(filters: AdminListingQuery) {
    const where = adminListingWhere(filters);
    const [listings, total] = await Promise.all([
      this.repository.findAdminPage({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.repository.countAdmin(where),
    ]);
    return {
      data: listings.map(toAdminListing),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async getAdmin(id: string) {
    const listing = await this.repository.findAdminById(id);
    if (!listing) {
      throw new AppError(
        404,
        "NOT_FOUND",
        "The requested resource was not found.",
      );
    }
    return { data: toAdminListing(listing) };
  }
}

export function toListingEnums(
  type: PublicListingType,
  offer: PublicListingOffer,
) {
  return {
    type: toListingType(type),
    offer: toListingOffer(offer),
  };
}

export function toListingType(type: PublicListingType) {
  return typeToDb[type];
}

export function toListingOffer(offer: PublicListingOffer) {
  return offerToDb[offer];
}

export function toListingStatus(status: PublicListingStatus) {
  return statusToDb[status];
}
