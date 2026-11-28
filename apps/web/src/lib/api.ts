import "server-only";
import type { Locale } from "@al-ahmadi/shared";
import { getMessages } from "./i18n";

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
  details: Record<string, unknown> | null;
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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${apiBaseUrl()}${path}`, {
      cache: "force-cache",
      next: { revalidate: 300, tags },
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Public listing API returned HTTP ${response.status}.`);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("API request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
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

const yesNoLabels = {
  ar: { yes: "نعم", no: "لا" },
  en: { yes: "Yes", no: "No" },
};

const classificationLabels = {
  ar: {
    residential: "سكنية",
    commercial: "تجارية",
    agricultural: "زراعية",
    industrial: "صناعية",
  },
  en: {
    residential: "Residential",
    commercial: "Commercial",
    agricultural: "Agricultural",
    industrial: "Industrial",
  },
};

const finishingLabels = {
  ar: { full: "تشطيب كامل", semi: "نصف تشطيب", raw: "على الطوب" },
  en: { full: "Full Finishing", semi: "Semi Finishing", raw: "Blockwork (Rough)" },
};

const unitSubTypeLabels = {
  ar: { duplex: "دوبلكس", roof: "روف", studio: "ستوديو", ground_garden: "أرضي بحديقة" },
  en: { duplex: "Duplex", roof: "Roof", studio: "Studio", ground_garden: "Ground with Garden" },
};

const statusLabels = {
  ar: { licensed: "مرخص", under_construction: "تحت الإنشاء", ready: "جاهز" },
  en: { licensed: "Licensed", under_construction: "Under Construction", ready: "Ready" },
};

function localizedYesNo(value: string | null | undefined, locale: Locale) {
  if (!value) return null;
  return value === "yes" ? yesNoLabels[locale].yes : yesNoLabels[locale].no;
}

export function listingSpecs(listing: PublicListing, locale: Locale) {
  const m = getMessages(locale);
  const d = (listing.details ?? {}) as Record<string, unknown>;
  const specs: { label: string; value: string }[] = [];

  const push = (label: string, value: string | null | undefined) => {
    if (value === null || value === undefined || value === "") return;
    specs.push({ label, value: String(value) });
  };

  if (listing.areaSqm !== null) {
    push(m.listings.area, `${listing.areaSqm}`);
  }

  const baseSpecs: { key: keyof PublicListing; label: string }[] = [];
  const showBedroomsBathrooms =
    listing.type === "apartment" ||
    listing.type === "residential_unit" ||
    listing.type === "villa";
  const showFloor =
    listing.type === "apartment" ||
    listing.type === "residential_unit" ||
    listing.type === "villa" ||
    listing.type === "building";
  if (showBedroomsBathrooms && listing.bedrooms !== null)
    baseSpecs.push({ key: "bedrooms", label: m.listings.bedrooms });
  if (showBedroomsBathrooms && listing.bathrooms !== null)
    baseSpecs.push({ key: "bathrooms", label: m.listings.bathrooms });
  if (showFloor && listing.floor !== null)
    baseSpecs.push({ key: "floor", label: m.listings.floor ?? "Floor" });

  for (const spec of baseSpecs) {
    const value = listing[spec.key] ?? null;
    push(spec.label, value === null ? undefined : String(value));
  }

  switch (listing.type) {
    case "apartment":
      push(
        m.listings.finishingType ?? "Finishing Type",
        finishingLabels[locale][
          d.finishingType as keyof typeof finishingLabels.ar
        ] ?? "",
      );
      push(m.listings.elevator ?? "Elevator", localizedYesNo(String(d.elevator ?? null), locale));
      if (d.utilities && Array.isArray(d.utilities))
        push(m.listings.utilities ?? "Utilities", (d.utilities as string[]).join(locale === "ar" ? " ، " : ", "));
      break;
    case "residential_unit":
      push(
        m.listings.unitSubType ?? "Unit Sub-type",
        unitSubTypeLabels[locale][
          d.unitSubType as keyof typeof unitSubTypeLabels.ar
        ] ?? "",
      );
      if (d.gardenRoofArea)
        push(m.listings.gardenRoofArea ?? "Garden / Roof Area", `${d.gardenRoofArea} m²`);
      push(
        m.listings.finishingType ?? "Finishing Type",
        finishingLabels[locale][
          d.finishingType as keyof typeof finishingLabels.ar
        ] ?? "",
      );
      push(m.listings.privateEntrance ?? "Private Entrance", localizedYesNo(String(d.privateEntrance ?? null), locale));
      break;
    case "villa":
      if (d.landArea) push(m.listings.landArea ?? "Land Area", `${d.landArea} m²`);
      if (d.gardenArea) push(m.listings.gardenArea ?? "Garden Area", `${d.gardenArea} m²`);
      push(m.listings.swimmingPool ?? "Swimming Pool", localizedYesNo(String(d.swimmingPool ?? null), locale));
      push(m.listings.garage ?? "Garage / Parking", localizedYesNo(String(d.garage ?? null), locale));
      push(
        m.listings.finishingType ?? "Finishing Type",
        finishingLabels[locale][
          d.finishingType as keyof typeof finishingLabels.ar
        ] ?? "",
      );
      break;
    case "building":
      if (d.totalLandArea)
        push(m.listings.totalLandArea ?? "Total Land Area", `${d.totalLandArea} m²`);
      if (d.builtUpAreaPerFloor)
        push(
          m.listings.builtUpAreaPerFloor ?? "Built-up Area per Floor",
          `${d.builtUpAreaPerFloor} m²`,
        );
      if (d.totalUnits) push(m.listings.totalUnits ?? "Total Units", `${d.totalUnits}`);
      if (d.commercialShops)
        push(m.listings.commercialShops ?? "Commercial Shops", `${d.commercialShops}`);
      push(m.listings.elevator ?? "Elevator", localizedYesNo(String(d.elevator ?? null), locale));
      push(
        m.listings.buildingStatus ?? "Building Status",
        statusLabels[locale][
          d.buildingStatus as keyof typeof statusLabels.ar
        ] ?? String(d.buildingStatus ?? ""),
      );
      if (d.incomeYield) push(m.listings.incomeYield ?? "Income / Yield", `${d.incomeYield}`);
      break;
    case "land":
      push(
        m.listings.landClassification ?? "Land Classification",
        classificationLabels[locale][
          d.landClassification as keyof typeof classificationLabels.ar
        ] ?? String(d.landClassification ?? ""),
      );
      if (d.streetWidth)
        push(m.listings.streetWidth ?? "Street Width", `${d.streetWidth} m`);
      if (d.facadeLength)
        push(m.listings.facadeLength ?? "Facade Length", `${d.facadeLength} m`);
      push(
        m.listings.buildingLicense ?? "Building License",
        localizedYesNo(String(d.buildingLicense ?? null), locale),
      );
      if (d.utilities && Array.isArray(d.utilities))
        push(m.listings.utilities ?? "Utilities", (d.utilities as string[]).join(locale === "ar" ? " ، " : ", "));
      break;
  }

  return specs;
}

