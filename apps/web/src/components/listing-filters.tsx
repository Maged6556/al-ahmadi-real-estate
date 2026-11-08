"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Locale } from "@al-ahmadi/shared";
import type {
  ListingFilterOptions,
  ListingFilters as FilterValues,
} from "../lib/api";
import { getMessages } from "../lib/i18n";

type Props = {
  locale: Locale;
  options: ListingFilterOptions;
  filters: FilterValues;
  facets: {
    types: { value: string; count: number }[];
    offers: { value: string; count: number }[];
  };
};

export function ListingFilters({ locale, options, filters, facets }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const messages = getMessages(locale);
  const [values, setValues] = useState(filters);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setValues(filters);
  }, [filters]);

  function navigate(next: FilterValues) {
    const query = new URLSearchParams();
    for (const key of [
      "type",
      "offer",
      "city",
      "district",
      "status",
      "q",
    ] as const) {
      const value = next[key];
      if (value) query.set(key, value);
    }
    if (next.page > 1) query.set("page", String(next.page));
    const suffix = query.toString();
    startTransition(() => {
      router.replace(suffix ? `${pathname}?${suffix}` : pathname, {
        scroll: false,
      });
    });
  }

  function update<K extends keyof FilterValues>(
    key: K,
    value: FilterValues[K],
  ) {
    const next = { ...values, [key]: value, page: 1 };
    setValues(next);
    if (key !== "q") navigate(next);
  }

  useEffect(() => {
    if (values.q === filters.q) return;
    const timeout = window.setTimeout(() => navigate(values), 300);
    return () => window.clearTimeout(timeout);
  }, [values.q, filters.q]);

  const cityDistricts = options.districts.filter(
    ({ city }) => !values.city || city === values.city,
  );
  const hasActiveFilters = Boolean(
    values.type ||
    values.offer ||
    values.city ||
    values.district ||
    values.status ||
    values.q,
  );

  return (
    <section
      className={`filter-panel ${isPending ? "filter-panel-pending" : ""}`}
      aria-label={messages.listings.title}
    >
      <div className="filter-toolbar">
        <div className="filter-search">
          <label htmlFor="listing-query">{messages.listings.search}</label>
          <div className="search-input-wrap">
            <span aria-hidden="true">⌕</span>
            <input
              id="listing-query"
              type="search"
              value={values.q ?? ""}
              placeholder={messages.listings.search}
              onChange={(event) => update("q", event.target.value || undefined)}
            />
          </div>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            className="clear-filters"
            onClick={() => {
              const next: FilterValues = { page: 1, limit: filters.limit };
              setValues(next);
              navigate(next);
            }}
          >
            {messages.listings.clear}
          </button>
        )}
      </div>
      <div className="filter-fields">
        <label>
          <span>{messages.listings.type}</span>
          <select
            value={values.type ?? ""}
            onChange={(event) =>
              update(
                "type",
                (event.target.value || undefined) as FilterValues["type"],
              )
            }
          >
            <option value="">{messages.listings.all}</option>
            {options.types.map((type) => (
              <option key={type} value={type}>
                {messages.listings[type]}
                {facetCount(facets.types, type)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{messages.listings.offer}</span>
          <select
            value={values.offer ?? ""}
            onChange={(event) =>
              update(
                "offer",
                (event.target.value || undefined) as FilterValues["offer"],
              )
            }
          >
            <option value="">{messages.listings.all}</option>
            {options.offers.map((offer) => (
              <option key={offer} value={offer}>
                {messages.listings[offer]}
                {facetCount(facets.offers, offer)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{messages.listings.city}</span>
          <select
            value={values.city ?? ""}
            onChange={(event) => {
              const next = {
                ...values,
                city: event.target.value || undefined,
                district: undefined,
                page: 1,
              };
              setValues(next);
              navigate(next);
            }}
          >
            <option value="">{messages.listings.all}</option>
            {options.cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{messages.listings.district}</span>
          <select
            value={values.district ?? ""}
            disabled={cityDistricts.length === 0}
            onChange={(event) =>
              update("district", event.target.value || undefined)
            }
          >
            <option value="">{messages.listings.all}</option>
            {[...new Set(cityDistricts.map(({ district }) => district))].map(
              (district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          <span>{messages.listings.status}</span>
          <select
            value={values.status ?? ""}
            onChange={(event) =>
              update(
                "status",
                (event.target.value || undefined) as FilterValues["status"],
              )
            }
          >
            <option value="">{messages.listings.all}</option>
            {options.statuses.map((status) => (
              <option key={status} value={status}>
                {messages.listings[status]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function facetCount(facets: { value: string; count: number }[], value: string) {
  const count = facets.find((facet) => facet.value === value)?.count;
  return count === undefined ? "" : ` (${count})`;
}
