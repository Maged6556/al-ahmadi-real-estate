import type { Metadata } from "next";
import { getMessages } from "../../../lib/i18n";
import { buildGenericWhatsAppUrl } from "../../../lib/whatsapp";
import { siteConfig, FACEBOOK_SVG } from "../../../lib/site-config";
import { requireLocale } from "../../../lib/route-locale";

const phone = "+201004761901";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "ar" ? "تواصل معنا" : "Contact",
    description: locale === "ar"
      ? "تواصل مع الأحمدى للتسويق العقاري عبر الواتساب أو البريد الإلكتروني أو الهاتف للاستفسار عن العقارات."
      : "Contact Al-ahmadi Real Estate Marketing via WhatsApp, email, or phone for property inquiries.",
    alternates: {
      canonical: `/${locale}/contact`,
      languages: {
        ar: "/ar/contact",
        en: "/en/contact",
      },
    },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  const messages = getMessages(locale);

  return (
    <main id="main-content" className="page-main contact-page">
      <section className="container contact-layout">
        <div className="contact-intro">
          <p className="eyebrow">{messages.contact.eyebrow}</p>
          <h1>{messages.contact.title}</h1>
          <p>{messages.contact.body}</p>
          <div className="contact-decoration" aria-hidden="true">
            <span>✦</span>
            <span>⌖</span>
            <span>✦</span>
          </div>
        </div>
        <div className="contact-options">
          <a
            href={buildGenericWhatsAppUrl(locale)}
            target="_blank"
            rel="noopener noreferrer"
            className="contact-option contact-option-primary"
          >
            <span className="contact-option-icon" aria-hidden="true">
              ◉
            </span>
            <span>
              <small>{messages.common.whatsapp}</small>
              <strong>{messages.contact.whatsapp}</strong>
            </span>
            <span className="contact-option-arrow" aria-hidden="true">
              ↗
            </span>
          </a>
          <a href={`tel:${phone}`} className="contact-option">
            <span className="contact-option-icon" aria-hidden="true">
              ⌕
            </span>
            <span>
              <small>{messages.contact.directCall}</small>
              <strong dir="ltr">{phone}</strong>
            </span>
            <span className="contact-option-arrow" aria-hidden="true">
              ↗
            </span>
          </a>
          <a
            href={siteConfig.social.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="contact-option contact-option-primary"
          >
            <span className="contact-option-icon" aria-hidden="true">
              {FACEBOOK_SVG}
            </span>
            <span>
              <small>{messages.contact.facebook}</small>
            </span>
          </a>
          <p className="contact-response">{messages.contact.languageNote}</p>
        </div>
      </section>
    </main>
  );
}
