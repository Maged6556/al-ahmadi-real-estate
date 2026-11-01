import "server-only";
import type { Locale } from "@al-ahmadi/shared";

export type ListingType =
  "apartment" | "building" | "residential_unit" | "villa" | "land";
export type ListingOffer = "sale" | "rent";
export type ListingStatus = "available" | "sold" | "rented";

export type PublicMedia = {
  kind: "image" | "video";
  url: string;
  width: number | null;
  height: number | null;
  sortOrder: number;
  isCover: boolean;
  altAr: string | null;
  altEn: string | null;
};

export type PublicListing = {
  code: string;
  slug: string;
  type: ListingType;
  offer: ListingOffer;
  status: ListingStatus;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  city: string;
  district: string | null;
  areaSqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  features: string[];
  publishedAt: string | null;
  media: PublicMedia[];
};

export type ListingFilters = {
  type?: ListingType;
  offer?: ListingOffer;
  city?: string;
  district?: string;
  status?: ListingStatus;
  q?: string;
  page: number;
  limit: number;
};

export type ListingsResponse = {
  data: PublicListing[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    facets: {
      types: { value: ListingType; count: number }[];
      offers: { value: ListingOffer; count: number }[];
    };
  };
};

export type ListingFilterOptions = {
  cities: string[];
  districts: { city: string; district: string }[];
  types: ListingType[];
  offers: ListingOffer[];
  statuses: ListingStatus[];
};

type ApiResult<T> = { data: T };

function apiBaseUrl() {
  const base =
    process.env.API_INTERNAL_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:4000";
  return base.replace(/\/+$/, "");
}

async function getJson<T>(path: string, tags: string[]): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    cache: "force-cache",
    next: { revalidate: 300, tags },
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Public listing API returned HTTP ${response.status}.`);
  }
  return (await response.json()) as T;
}

export async function getListings(
  filters: ListingFilters,
): Promise<ListingsResponse> {
  const query = new URLSearchParams();
  for (const key of [
    "type",
    "offer",
    "city",
    "district",
    "status",
    "q",
  ] as const) {
    const value = filters[key];
    if (value) query.set(key, value);
  }
  query.set("page", String(filters.page));
  query.set("limit", String(filters.limit));
  return getJson(`/api/listings?${query}`, ["listings"]);
}

export async function getListing(slug: string): Promise<PublicListing | null> {
  try {
    const result = await getJson<ApiResult<PublicListing>>(
      `/api/listings/${encodeURIComponent(slug)}`,
      ["listings", `listing:${slug}`],
    );
    return result.data;
  } catch (error) {
    if (error instanceof Error && error.message.includes("HTTP 404")) {
      return null;
    }
    throw error;
  }
}

export async function getListingFilters(): Promise<ListingFilterOptions> {
  const result = await getJson<ApiResult<ListingFilterOptions>>(
    "/api/meta/filters",
    ["listings"],
  );
  return result.data;
}

export function localizedListingText(listing: PublicListing, locale: Locale) {
  return {
    title: locale === "ar" ? listing.titleAr : listing.titleEn,
    description:
      locale === "ar" ? listing.descriptionAr : listing.descriptionEn,
    imageAlt: (altAr: string | null, altEn: string | null) =>
      (locale === "ar" ? altAr : altEn) ||
      (locale === "ar" ? listing.titleAr : listing.titleEn),
  };
}
