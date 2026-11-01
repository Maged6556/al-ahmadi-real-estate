import Link from "next/link";
import type { Locale } from "@al-ahmadi/shared";
import { getMessages } from "../lib/i18n";
import { buildGenericWhatsAppUrl } from "../lib/whatsapp";
import { CookieSettingsButton } from "./cookie-settings-button";

export function SiteFooter({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  const licenseNumber = process.env.BROKER_LICENSE_NUMBER?.trim();
  return (
    <>
      <a
        className="whatsapp-float"
        href={buildGenericWhatsAppUrl(locale)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={messages.common.whatsapp}
      >
        <span aria-hidden="true">◉</span>
        <span>{messages.common.whatsapp}</span>
      </a>
      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <Link href={`/${locale}`} className="brand footer-brand-link">
              <span className="brand-mark" aria-hidden="true">
                أ
              </span>
              <span className="brand-name">{messages.brand}</span>
            </Link>
            <p>{messages.footer.description}</p>
          </div>
          <nav
            className="footer-nav"
            aria-label={locale === "ar" ? "روابط الموقع" : "Site links"}
          >
            <Link href={`/${locale}/listings`}>{messages.nav.listings}</Link>
            <Link href={`/${locale}/about`}>{messages.nav.about}</Link>
            <Link href={`/${locale}/contact`}>{messages.nav.contact}</Link>
            <Link href={`/${locale}/register`}>{messages.nav.register}</Link>
            <Link href={`/${locale}/legal/privacy`}>
              {messages.footer.privacy}
            </Link>
            <Link href={`/${locale}/legal/terms`}>{messages.footer.terms}</Link>
            <Link href={`/${locale}/legal/cookies`}>
              {messages.footer.cookies}
            </Link>
            <CookieSettingsButton locale={locale} />
          </nav>
          <div className="footer-note">
            <p>{messages.footer.disclaimer}</p>
            {licenseNumber && (
              <p>
                {messages.footer.license} {licenseNumber}
              </p>
            )}
            <small>
              © {new Date().getFullYear()} {messages.brand}.{" "}
              {messages.footer.rights}
            </small>
          </div>
        </div>
      </footer>
    </>
  );
}
