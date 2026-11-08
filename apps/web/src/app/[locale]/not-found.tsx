"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { getMessages } from "../../lib/i18n";

export default function NotFound() {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale === "en" ? "en" : "ar";
  const messages = getMessages(locale);

  return (
    <main id="main-content" className="page-main state-page">
      <span className="state-code">404</span>
      <p className="eyebrow">{messages.common.error}</p>
      <h1>{locale === "ar" ? "الصفحة غير موجودة" : "Page not found"}</h1>
      <Link href={`/${locale}`} className="button button-primary">
        {messages.nav.home}
      </Link>
    </main>
  );
}
