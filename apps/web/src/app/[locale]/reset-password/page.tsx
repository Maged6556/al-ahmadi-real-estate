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
    title: locale === "ar" ? "تعيين كلمة مرور جديدة" : "Choose a new password",
    robots: { index: false, follow: false },
  };
}

export default async function ResetPasswordPage({
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
        <p className="eyebrow">{copy.resetTitle}</p>
        <h1>{copy.resetTitle}</h1>
        <LifecycleForm locale={locale} mode="reset" />
      </section>
    </main>
  );
}
