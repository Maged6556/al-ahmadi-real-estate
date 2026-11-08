import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@al-ahmadi/shared";
import type { PublicListing } from "../lib/api";
import { localizedListingText } from "../lib/api";
import { getMessages } from "../lib/i18n";

export function ListingCard({
  listing,
  locale,
}: {
  listing: PublicListing;
  locale: Locale;
}) {
  const messages = getMessages(locale);
  const text = localizedListingText(listing, locale);
  const cover =
    listing.media.find((media) => media.isCover && media.kind === "image") ??
    listing.media.find((media) => media.kind === "image");
  const statusClass = `status-${listing.status}`;
  const typeLabel = messages.listings[listing.type];
  const offerLabel = messages.listings[listing.offer];

  return (
    <article
      className={`listing-card ${listing.status !== "available" ? "listing-card-inactive" : ""}`}
    >
      <Link
        href={`/${locale}/listings/${encodeURIComponent(listing.slug)}`}
        className="listing-card-link"
        aria-label={`${text.title} — ${typeLabel}, ${offerLabel}`}
      >
        <div className="listing-card-image">
          {cover ? (
            <Image
              src={cover.url}
              alt={text.imageAlt(cover.altAr, cover.altEn)}
              fill
              sizes="(max-width: 700px) 100vw, (max-width: 1050px) 50vw, 33vw"
              className="listing-image"
            />
          ) : (
            <span className="image-placeholder">{messages.common.noImage}</span>
          )}
          <span className={`status-badge ${statusClass}`}>
            {messages.listings[listing.status]}
          </span>
        </div>
        <div className="listing-card-content">
          <div className="listing-card-kicker">
            <span>{typeLabel}</span>
            <span className="kicker-separator" aria-hidden="true">
              ·
            </span>
            <span>{offerLabel}</span>
          </div>
          <h3>{text.title}</h3>
          <p className="listing-location">
            <span aria-hidden="true">⌖</span> {listing.city}
            {listing.district ? `، ${listing.district}` : ""}
          </p>
          <div className="listing-specs">
            {listing.areaSqm !== null && (
              <span>
                {listing.areaSqm} {messages.listings.area}
              </span>
            )}
            {listing.bedrooms !== null && (
              <span>
                {listing.bedrooms} {messages.listings.bedrooms}
              </span>
            )}
            {listing.bathrooms !== null && (
              <span>
                {listing.bathrooms} {messages.listings.bathrooms}
              </span>
            )}
          </div>
          <span className="listing-card-cta">
            {messages.listings.details}
            <span aria-hidden="true">{locale === "ar" ? " ←" : " →"}</span>
          </span>
        </div>
      </Link>
      <div
        data-feature-slot="favorites"
        data-listing-slug={listing.slug}
        hidden
      />
    </article>
  );
}
