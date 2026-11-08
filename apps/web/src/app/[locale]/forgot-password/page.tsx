import type { Metadata } from "next";
import { LifecycleForm } from "../../../components/lifecycle-form";
import { getMessages } from "../../../lib/i18n";
import { requireLocale } from "../../../lib/route-locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "ar" ? "استعادة كلمة المرور" : "Reset your password",
    robots: { index: false, follow: false },
  };
}

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  const copy = getMessages(locale).lifecycle;
  return (
    <main id="main-content" className="page-main auth-page">
      <section className="auth-card">
        <p className="eyebrow">{copy.forgotTitle}</p>
        <h1>{copy.forgotText}</h1>
        <LifecycleForm locale={locale} mode="forgot" />
      </section>
    </main>
  );
}
