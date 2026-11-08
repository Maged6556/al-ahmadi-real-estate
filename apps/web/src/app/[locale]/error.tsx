"use client";

import { useParams } from "next/navigation";
import { getMessages } from "../../lib/i18n";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale === "en" ? "en" : "ar";
  const messages = getMessages(locale);

  return (
    <main id="main-content" className="page-main state-page">
      <span className="state-code">!</span>
      <p className="eyebrow">{messages.common.error}</p>
      <h1>
        {locale === "ar"
          ? "تعذر تحميل الصفحة"
          : "This page could not be loaded"}
      </h1>
      <button className="button button-primary" onClick={reset}>
        {messages.common.tryAgain}
      </button>
    </main>
  );
}
