import type { Metadata } from "next";
import { AuthForm } from "../../../components/auth-form";
import { getMessages } from "../../../lib/i18n";
import { requireLocale } from "../../../lib/route-locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "ar" ? "تسجيل الدخول" : "Log in",
    robots: { index: false, follow: false },
  };
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  const messages = getMessages(locale);
  return (
    <main id="main-content" className="page-main auth-page">
      <section className="auth-card">
        <div className="auth-card-heading">
          <span className="auth-mark" aria-hidden="true">
            أ
          </span>
          <p className="eyebrow">{messages.nav.login}</p>
          <h1>{messages.auth.loginTitle}</h1>
        </div>
        <AuthForm locale={locale} mode="login" />
      </section>
    </main>
  );
}
