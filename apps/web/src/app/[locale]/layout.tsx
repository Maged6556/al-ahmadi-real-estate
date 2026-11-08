import type { Metadata } from "next";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { CookieConsent } from "../../components/cookie-consent";
import { requireLocale } from "../../lib/route-locale";
import "../globals.css";

export const metadata: Metadata = {
  title: {
    default: "Al-ahmadi Real Estate Marketing",
    template: "%s | Al-ahmadi Real Estate",
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  applicationName: "Al-ahmadi Real Estate Marketing",
  alternates: {
    languages: { ar: "/ar", en: "/en" },
  },
};

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
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body>
        <a className="skip-link" href="#main-content">
          {locale === "ar" ? "انتقل إلى المحتوى" : "Skip to content"}
        </a>
        <SiteHeader locale={locale} />
        {children}
        <SiteFooter locale={locale} />
        <CookieConsent locale={locale} />
      </body>
    </html>
  );
}
