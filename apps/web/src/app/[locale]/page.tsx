import Link from "next/link";
import type { Metadata } from "next";
import type { PublicListing } from "../../lib/api";
import { ListingGrid } from "../../components/listing-grid";
import { getListings } from "../../lib/api";
import { getMessages } from "../../lib/i18n";
import { requireLocale } from "../../lib/route-locale";

export const dynamic = "force-dynamic";

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
  icon: string;
}[] = [
  { type: "apartment", icon: "⌂" },
  { type: "building", icon: "▥" },
  { type: "residential_unit", icon: "⌂" },
  { type: "villa", icon: "⌂" },
  { type: "land", icon: "▱" },
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
                <span aria-hidden="true">{locale === "ar" ? " ←" : " →"}</span>
              </Link>
              <Link
                href={`/${locale}/contact`}
                className="button button-outline"
              >
                {messages.home.contact}
              </Link>
            </div>
            <div className="hero-proof">
              <span className="proof-star" aria-hidden="true">
                ✦
              </span>
              <span>{messages.home.experience}</span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-sun" />
            <div className="hero-building building-back">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="hero-building building-front">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="hero-ground" />
            <div className="hero-art-label">
              <span className="label-dot" />
              <span>
                {locale === "ar" ? "وجهتك العقارية" : "Your property journey"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-section">
        <div className="container trust-inner">
          <div className="trust-icon" aria-hidden="true">
            ✦
          </div>
          <div>
            <p className="eyebrow">{messages.home.experience}</p>
            <p>{messages.home.experienceText}</p>
          </div>
          <div className="trust-stat">
            <strong>04</strong>
            <span>{locale === "ar" ? "سنوات خبرة" : "Years experience"}</span>
          </div>
          <div className="trust-stat">
            <strong>01</strong>
            <span>{locale === "ar" ? "فريق يهتم بك" : "Dedicated team"}</span>
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
              <span aria-hidden="true">{locale === "ar" ? " ←" : " →"}</span>
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
                <span className="category-arrow" aria-hidden="true">
                  {locale === "ar" ? "↙" : "↘"}
                </span>
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
              <span aria-hidden="true">{locale === "ar" ? " ←" : " →"}</span>
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
