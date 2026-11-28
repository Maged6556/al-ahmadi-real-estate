import type { Metadata } from "next";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { CookieConsent } from "../../components/cookie-consent";
import { requireLocale } from "../../lib/route-locale";
import { getCspNonce } from "../../lib/csp";
import { getServerAuth } from "../../lib/auth-server";
import { siteConfig } from "../../lib/site-config";
import "../../lib/fontawesome";
import "../globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://al-ahmadi-real-estate-od57.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "Al-ahmadi Real Estate Marketing",
    template: "%s | Al-ahmadi Real Estate",
  },
  metadataBase: new URL(SITE_URL),
  applicationName: "Al-ahmadi Real Estate Marketing",
  alternates: {
    languages: { ar: "/ar", en: "/en" },
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Al-ahmadi Real Estate Marketing",
    description:
      "Explore selected properties for sale and rent with personal service and local market experience.",
    type: "website",
    locale: "en_US",
    siteName: "Al-ahmadi Real Estate",
  },
  twitter: {
    card: "summary_large_image",
    title: "Al-ahmadi Real Estate Marketing",
    description:
      "Explore selected properties for sale and rent with personal service and local market experience.",
  },
};

export function structuredData(locale: string) {
  const isArabic = locale === "ar";
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#business`,
    name: isArabic ? "الأحمدي للتسويق العقاري" : "Al-ahmadi Real Estate Marketing",
    description: isArabic
      ? "شركة تسويق عقاري متخصصة في بيع وإيجار العقارات بخدمة شخصية وخبرة في السوق المحلي."
      : "Real estate marketing company specializing in property sales and rentals with personal service and local market expertise.",
    url: SITE_URL,
    telephone: "+201004761901",
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      addressCountry: "EG",
    },
    sameAs: [siteConfig.social.facebook],
  };
}

export function generateStaticParams() {
  return [{ locale: "ar" }, { locale: "en" }];
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  const nonce = await getCspNonce();
  const account = await getServerAuth();
  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      suppressHydrationWarning
    >
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&m)){document.documentElement.setAttribute('data-theme','dark');}else{document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();`,
          }}
        />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData(locale)),
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <a className="skip-link" href="#main-content">
          {locale === "ar" ? "انتقل إلى المحتوى" : "Skip to content"}
        </a>
        <SiteHeader locale={locale} account={account} />
        {children}
        <SiteFooter locale={locale} />
        <CookieConsent locale={locale} />
      </body>
    </html>
  );
}
