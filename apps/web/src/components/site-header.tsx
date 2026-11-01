"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@al-ahmadi/shared";
import { getMessages, localizedPath } from "../lib/i18n";

export function SiteHeader({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const messages = getMessages(locale);
  const nextLocale: Locale = locale === "ar" ? "en" : "ar";

  function changeLocale(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    document.cookie = `locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    const translatedPath = localizedPath(nextLocale, pathname);
    window.location.assign(`${translatedPath}${window.location.search}`);
  }

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href={`/${locale}`} className="brand" aria-label={messages.brand}>
          <span className="brand-mark" aria-hidden="true">
            أ
          </span>
          <span className="brand-name">{messages.brand}</span>
        </Link>
        <nav
          className="main-nav"
          aria-label={locale === "ar" ? "التنقل الرئيسي" : "Main navigation"}
        >
          <Link href={`/${locale}`}>{messages.nav.home}</Link>
          <Link href={`/${locale}/listings`}>{messages.nav.listings}</Link>
          <Link href={`/${locale}/about`}>{messages.nav.about}</Link>
          <Link href={`/${locale}/contact`}>{messages.nav.contact}</Link>
        </nav>
        <div className="header-actions">
          <Link href={`/${locale}/admin`} className="header-login">
            {locale === "ar" ? "لوحة الإدارة" : "Admin"}
          </Link>
          <Link href={`/${locale}/login`} className="header-login">
            {messages.nav.login}
          </Link>
          <Link href={`/${locale}/account`} className="header-login">
            {messages.nav.account}
          </Link>
          <a
            href={localizedPath(nextLocale, pathname)}
            className="locale-switch"
            lang={nextLocale}
            dir={nextLocale === "ar" ? "rtl" : "ltr"}
            onClick={changeLocale}
          >
            {nextLocale === "ar" ? "العربية" : "English"}
          </a>
        </div>
      </div>
    </header>
  );
}
