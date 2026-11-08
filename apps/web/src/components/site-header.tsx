"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Locale } from "@al-ahmadi/shared";
import { adminRequest } from "../lib/admin-api";
import { getMessages, localizedPath } from "../lib/i18n";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const messages = getMessages(locale);
  const [account, setAccount] = useState<{
    name: string | null;
    email: string;
    role: string;
  } | null>(null);
  const nextLocale: Locale = locale === "ar" ? "en" : "ar";

  useEffect(() => {
    let active = true;
    adminRequest<{
      data: { user: { name: string | null; email: string; role: string } };
    }>("/api/auth/me")
      .then(({ data }) => {
        if (active) setAccount(data.user);
      })
      .catch(() => {
        if (active) setAccount(null);
      });

    return () => {
      active = false;
    };
  }, []);

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
          <Image
            src="/al-ahmadi-logo.jpg"
            alt=""
            width={56}
            height={56}
            className="brand-logo"
            priority
          />
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
          <ThemeToggle locale={locale} />
          <Link
            href={`/${locale}/${
              account
                ? account.role === "ADMIN" || account.role === "EDITOR"
                  ? "admin"
                  : "account"
                : "login"
            }`}
            className="header-login"
          >
            {account?.name || account?.email || messages.nav.account}
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
