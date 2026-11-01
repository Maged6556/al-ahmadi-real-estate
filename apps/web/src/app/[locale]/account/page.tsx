import type { Metadata } from "next";
import { AccountCenter } from "../../../components/account-center";
import { getMessages } from "../../../lib/i18n";
import { requireLocale } from "../../../lib/route-locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "ar" ? "إعدادات الحساب" : "Account settings",
    robots: { index: false, follow: false },
  };
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  const copy = getMessages(locale).account;
  return (
    <main id="main-content" className="page-main container account-page">
      <div className="page-intro">
        <p className="eyebrow">{copy.title}</p>
        <h1>{copy.title}</h1>
      </div>
      <AccountCenter locale={locale} />
    </main>
  );
}
