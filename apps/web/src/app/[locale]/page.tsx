import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { PublicListing } from "../../lib/api";
import { ListingGrid } from "../../components/listing-grid";
import { Icon } from "../../components/ui/icon";
import {
  faArrowLeft,
  faArrowRight,
  faBuilding,
  faHouse,
  faStar,
} from "@fortawesome/free-solid-svg-icons";
import { getListings } from "../../lib/api";
import { getMessages } from "../../lib/i18n";
import { requireLocale } from "../../lib/route-locale";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isArabic = locale === "ar";
  return {
    title: isArabic
      ? "الأحمدي للتسويق العقاري"
      : "Al-ahmadi Real Estate Marketing",
    description: isArabic
      ? "اكتشف عقارات مختارة للبيع والإيجار مع خدمة شخصية وخبرة في السوق العقاري."
      : "Explore selected properties for sale and rent with personal service and local market experience.",
    alternates: {
      canonical: `/${locale}`,
      languages: { ar: "/ar", en: "/en" },
    },
  };
}

const categories: {
  type: "apartment" | "building" | "residential_unit" | "villa" | "land";
  icon: ReturnType<typeof Icon> | React.ReactNode;
}[] = [
  { type: "apartment", icon: <Icon icon={faHouse} size="lg" /> },
  { type: "building", icon: <Icon icon={faBuilding} size="lg" /> },
  { type: "residential_unit", icon: <Icon icon={faHouse} size="lg" /> },
  { type: "villa", icon: <Icon icon={faHouse} size="lg" /> },
  { type: "land", icon: (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="land-icon"
    >
      <path d="M4 4h16v16H4z" />
      <path d="M4 4l16 16" />
      <circle cx="4" cy="4" r="1" fill="currentColor" />
      <circle cx="20" cy="4" r="1" fill="currentColor" />
      <circle cx="4" cy="20" r="1" fill="currentColor" />
      <circle cx="20" cy="20" r="1" fill="currentColor" />
    </svg>
  ) },
];

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  const messages = getMessages(locale);
  let featuredListings: PublicListing[] = [];
  let listingsAvailable = true;

  try {
    const response = await getListings({ page: 1, limit: 6 });
    featuredListings = response.data.slice(0, 3);
  } catch {
    listingsAvailable = false;
  }

  return (
    <main id="main-content">
      <section className="hero-section">
        <div className="container hero-layout">
          <div className="hero-copy">
            <p className="eyebrow">{messages.home.eyebrow}</p>
            <h1>{messages.home.title}</h1>
            <p className="hero-description">{messages.home.description}</p>
            <div className="hero-actions">
              <Link
                href={`/${locale}/listings`}
                className="button button-primary"
              >
                {messages.home.browse}
                <Icon icon={locale === "ar" ? faArrowLeft : faArrowRight} size="xs" className="ml-1" aria-hidden="true" />
              </Link>
              <Link
                href={`/${locale}/contact`}
                className="button button-outline"
              >
                {messages.home.contact}
              </Link>
            </div>
            <div className="hero-proof">
              <Icon icon={faStar} size="xs" className="proof-icon" aria-hidden="true" />
              <span>{messages.home.experience}</span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <Image
              src="/al-ahmadi-logo.jpg"
              alt=""
              fill
              priority
              loading="eager"
              sizes="(max-width: 700px) 100vw, 45vw"
              className="hero-visual-logo"
            />
            <div className="hero-art-label">
              <span className="label-dot" />
              <span>{messages.home.heroJourney}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-section">
        <div className="container trust-inner">
          <div className="trust-icon" aria-hidden="true">
            <Icon icon={faStar} size="lg" />
          </div>
          <div>
            <p className="eyebrow">{messages.home.experience}</p>
            <p>{messages.home.experienceText}</p>
          </div>
          <div className="trust-stat">
            <strong>06</strong>
            <span>{messages.home.yearsExperience}</span>
          </div>
          <div className="trust-stat">
            <strong>01</strong>
            <span>{messages.home.dedicatedTeam}</span>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{messages.home.categories}</p>
              <h2>{messages.home.categoriesText}</h2>
            </div>
            <Link href={`/${locale}/listings`} className="text-link">
              {messages.home.allListings}
              <Icon icon={locale === "ar" ? faArrowLeft : faArrowRight} size="xs" className="ml-1" aria-hidden="true" />
            </Link>
          </div>
          <div className="category-grid">
            {categories.map(({ type, icon }) => (
              <Link
                key={type}
                href={`/${locale}/listings?type=${type}`}
                className="category-card"
              >
                <span className="category-icon" aria-hidden="true">
                  {icon}
                </span>
                <span>{messages.listings[type]}</span>
                <Icon
                  icon={locale === "ar" ? faArrowLeft : faArrowRight}
                  size="xs"
                  className="category-arrow-icon"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section-block featured-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{messages.home.featured}</p>
              <h2>{messages.home.featuredText}</h2>
            </div>
            <Link href={`/${locale}/listings`} className="text-link">
              {messages.home.allListings}
              <Icon icon={locale === "ar" ? faArrowLeft : faArrowRight} size="xs" className="ml-1" aria-hidden="true" />
            </Link>
          </div>
          {!listingsAvailable ? (
            <div className="inline-error" role="status">
              {messages.listings.loadError}
            </div>
          ) : (
            <ListingGrid listings={featuredListings} locale={locale} />
          )}
        </div>
      </section>
    </main>
  );
}
