import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "@al-ahmadi/shared";
import { getListing, localizedListingText } from "../../../../lib/api";
import { getMessages } from "../../../../lib/i18n";
import { buildListingWhatsAppUrl } from "../../../../lib/whatsapp";
import { requireLocale } from "../../../../lib/route-locale";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const locale = requireLocale(localeParam);
  const listing = await getListing(slug);
  if (!listing) {
    return {
      title: locale === "ar" ? "العقار غير موجود" : "Property not found",
    };
  }
  const text = localizedListingText(listing, locale);
  const image = listing.media.find((item) => item.isCover)?.url;
  return {
    title: text.title,
    description: text.description.slice(0, 160),
    alternates: {
      canonical: `/${locale}/listings/${encodeURIComponent(listing.slug)}`,
      languages: {
        ar: `/ar/listings/${encodeURIComponent(listing.slug)}`,
        en: `/en/listings/${encodeURIComponent(listing.slug)}`,
      },
    },
    openGraph: {
      type: "article",
      title: text.title,
      description: text.description.slice(0, 160),
      images: image ? [{ url: image, alt: text.title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: text.title,
      description: text.description.slice(0, 160),
      images: image ? [image] : undefined,
    },
  };
}

function formatListingType(
  type: "apartment" | "building" | "residential_unit" | "villa" | "land",
  locale: Locale,
) {
  const labels = {
    ar: {
      apartment: "شقة",
      building: "مبنى",
      residential_unit: "وحدة سكنية",
      villa: "فيلا",
      land: "أرض",
    },
    en: {
      apartment: "apartment",
      building: "building",
      residential_unit: "residential unit",
      villa: "villa",
      land: "land",
    },
  };
  return labels[locale][type];
}

export default async function ListingDetailPage({ params }: Props) {
  const { locale: localeParam, slug } = await params;
  const locale = requireLocale(localeParam);
  const messages = getMessages(locale);
  const listing = await getListing(slug);
  if (!listing) notFound();

  const text = localizedListingText(listing, locale);
  const images = listing.media.filter((item) => item.kind === "image");
  const video = listing.media.find((item) => item.kind === "video");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const listingUrl = new URL(
    `/${locale}/listings/${encodeURIComponent(listing.slug)}`,
    siteUrl,
  ).toString();
  const whatsappUrl = buildListingWhatsAppUrl(listing, locale, listingUrl);
  const statusLabel = messages.listings[listing.status];
  const offerLabel = messages.listings[listing.offer];
  const typeLabel = formatListingType(listing.type, locale);

  return (
    <main id="main-content" className="page-main detail-page">
      <div className="container">
        <Link href={`/${locale}/listings`} className="back-link">
          <span aria-hidden="true">{locale === "ar" ? "→" : "←"}</span>
          {messages.detail.back}
        </Link>

        <section className="detail-layout">
          <div className="detail-media">
            <div
              className="detail-gallery"
              aria-label={messages.detail.gallery}
            >
              {images.length > 0 ? (
                images.slice(0, 5).map((image, index) => (
                  <div
                    key={image.url}
                    className={`detail-gallery-image gallery-image-${Math.min(index, 4)}`}
                  >
                    <Image
                      src={image.url}
                      alt={text.imageAlt(image.altAr, image.altEn)}
                      fill
                      priority={index === 0}
                      sizes="(max-width: 800px) 100vw, 65vw"
                      className="listing-image"
                    />
                  </div>
                ))
              ) : (
                <div className="detail-empty-image">
                  {messages.common.noImage}
                </div>
              )}
            </div>
            {video && (
              <video
                className="detail-video"
                controls
                preload="none"
                aria-label={text.title}
              >
                <source src={video.url} />
              </video>
            )}
          </div>

          <aside className="detail-summary">
            <div className="detail-badges">
              <span className={`status-badge status-${listing.status}`}>
                {statusLabel}
              </span>
              <span className="type-badge">{offerLabel}</span>
            </div>
            <p className="detail-code">
              {messages.common.listingCode} {listing.code}
            </p>
            <h1>{text.title}</h1>
            <p className="detail-location">
              <span aria-hidden="true">⌖</span>
              {listing.city}
              {listing.district ? `، ${listing.district}` : ""}
            </p>
            <div className="detail-summary-rule" />
            <div className="detail-meta">
              <span>{typeLabel}</span>
              <span>{offerLabel}</span>
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
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="button button-whatsapp detail-contact"
            >
              <span aria-hidden="true">◉</span>
              {listing.status === "available"
                ? messages.detail.whatsappAvailable
                : messages.detail.whatsappUnavailable}
            </a>
            <p className="detail-contact-note">{messages.detail.similar}</p>
          </aside>
        </section>

        <section className="detail-content-grid">
          <article className="detail-description">
            <p className="eyebrow">{messages.listings.details}</p>
            <h2>{text.title}</h2>
            <p className="description-copy">{text.description}</p>
            {listing.features.length > 0 && (
              <div className="detail-features">
                <h3>{messages.detail.features}</h3>
                <ul>
                  {listing.features.map((feature) => (
                    <li key={feature}>
                      <span className="feature-check" aria-hidden="true">
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
          <aside className="location-card">
            <p className="eyebrow">{messages.detail.location}</p>
            <div className="location-visual" aria-hidden="true">
              <span className="location-pin">⌖</span>
              <span className="location-circle" />
              <span className="location-line location-line-one" />
              <span className="location-line location-line-two" />
            </div>
            <h3>{listing.city}</h3>
            <p>
              {listing.district
                ? `${listing.district} · ${messages.detail.addressPrivate}`
                : messages.detail.addressPrivate}
            </p>
          </aside>
        </section>
      </div>
    </main>
  );
}
