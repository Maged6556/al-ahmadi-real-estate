import Link from "next/link";
import type { Metadata } from "next";
import {
  getListingFilters,
  getListings,
  type ListingFilters as FilterValues,
  type ListingOffer,
  type ListingStatus,
  type ListingType,
  type ListingsResponse,
} from "../../../lib/api";
import { getMessages } from "../../../lib/i18n";
import { ListingFilters } from "../../../components/listing-filters";
import { ListingGrid } from "../../../components/listing-grid";
import { requireLocale } from "../../../lib/route-locale";

export const dynamic = "force-dynamic";

const listingTypes: ListingType[] = [
  "apartment",
  "building",
  "residential_unit",
  "villa",
  "land",
];
const listingOffers: ListingOffer[] = ["sale", "rent"];
const listingStatuses: ListingStatus[] = ["available", "sold", "rented"];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | string[] | undefined) {
  const parsed = Number(first(value));
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, 1_000_000)
    : 1;
}

function parseFilters(
  query: Record<string, string | string[] | undefined>,
): FilterValues {
  const type = first(query.type);
  const offer = first(query.offer);
  const status = first(query.status);
  return {
    type: listingTypes.find((value) => value === type),
    offer: listingOffers.find((value) => value === offer),
    status: listingStatuses.find((value) => value === status),
    city: first(query.city),
    district: first(query.district),
    q: first(query.q),
    page: parsePage(query.page),
    limit: 24,
  };
}

function pageHref(locale: "ar" | "en", filters: FilterValues, page: number) {
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
  if (page > 1) query.set("page", String(page));
  const suffix = query.toString();
  return `/${locale}/listings${suffix ? `?${suffix}` : ""}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  return {
    title: locale === "ar" ? "العقارات" : "Properties",
    description:
      locale === "ar"
        ? "تصفح العقارات المتاحة للبيع والإيجار."
        : "Browse available properties for sale and rent.",
    alternates: {
      canonical: `/${locale}/listings`,
      languages: {
        ar: "/ar/listings",
        en: "/en/listings",
      },
    },
  };
}

export default async function ListingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale: localeParam }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const locale = requireLocale(localeParam);
  const messages = getMessages(locale);
  const filters = parseFilters(query);
  let options;
  let result: ListingsResponse | null = null;
  let failed = false;

  try {
    [options, result] = await Promise.all([
      getListingFilters(),
      getListings(filters),
    ]);
  } catch {
    failed = true;
    options = {
      cities: [],
      districts: [],
      types: listingTypes,
      offers: listingOffers,
      statuses: listingStatuses,
    };
  }

  return (
    <main id="main-content" className="page-main">
      <section className="page-intro container">
        <p className="eyebrow">{messages.listings.eyebrow}</p>
        <h1>{messages.listings.title}</h1>
        <p>{messages.listings.description}</p>
      </section>
      <section className="container listing-browser">
        <div id="property-map-slot" data-feature-slot="property-map" hidden />
        <ListingFilters
          key={JSON.stringify(filters)}
          locale={locale}
          options={options}
          filters={filters}
          facets={result?.meta.facets ?? { types: [], offers: [] }}
        />
        {failed || !result ? (
          <div className="inline-error" role="alert">
            {messages.listings.loadError}
          </div>
        ) : (
          <>
            <div className="results-summary">
              <strong>{result.meta.total}</strong>
              <span>{messages.listings.results}</span>
            </div>
            <ListingGrid listings={result.data} locale={locale} />
            {result.meta.totalPages > 1 && (
              <nav
                className="pagination"
                aria-label={
                  locale === "ar" ? "التنقل بين الصفحات" : "Pagination"
                }
              >
                {filters.page > 1 ? (
                  <Link
                    className="pagination-link"
                    href={pageHref(locale, filters, filters.page - 1)}
                  >
                    {messages.listings.previous}
                  </Link>
                ) : (
                  <span />
                )}
                <span>
                  {messages.listings.page} {filters.page} /{" "}
                  {result.meta.totalPages}
                </span>
                {filters.page < result.meta.totalPages ? (
                  <Link
                    className="pagination-link"
                    href={pageHref(locale, filters, filters.page + 1)}
                  >
                    {messages.listings.next}
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </>
        )}
      </section>
    </main>
  );
}
