import Link from "next/link";
import type { Metadata } from "next";
import { getMessages } from "../../../lib/i18n";
import { requireLocale } from "../../../lib/route-locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "ar" ? "من نحن" : "About us",
    alternates: {
      canonical: `/${locale}/about`,
      languages: {
        ar: "/ar/about",
        en: "/en/about",
      },
    },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  const messages = getMessages(locale);

  return (
    <main id="main-content" className="page-main">
      <section className="about-hero">
        <div className="container about-layout">
          <div className="about-copy">
            <p className="eyebrow">{messages.about.eyebrow}</p>
            <h1>{messages.about.title}</h1>
            <p>{messages.about.body}</p>
            <Link
              href={`/${locale}/listings`}
              className="button button-primary"
            >
              {messages.home.browse}
              <span aria-hidden="true">{locale === "ar" ? " ←" : " →"}</span>
            </Link>
          </div>
          <div className="about-visual" aria-hidden="true">
            <div className="about-visual-circle">
              <span>04</span>
              <small>
                {locale === "ar" ? "سنوات خبرة" : "years of experience"}
              </small>
            </div>
            <span className="about-spark about-spark-one">✦</span>
            <span className="about-spark about-spark-two">✦</span>
          </div>
        </div>
      </section>
      <section className="section-block">
        <div className="container about-values">
          <article>
            <span className="value-number">01</span>
            <h2>{locale === "ar" ? "نستمع أولاً" : "We listen first"}</h2>
            <p>
              {locale === "ar"
                ? "نفهم احتياجك وأولوياتك قبل أن نساعدك في استكشاف الخيارات."
                : "We understand your needs and priorities before exploring your options."}
            </p>
          </article>
          <article>
            <span className="value-number">02</span>
            <h2>{locale === "ar" ? "معلومة واضحة" : "Clear information"}</h2>
            <p>
              {locale === "ar"
                ? "نقدم تفاصيل العقار المتاحة بشفافية، ونوضح ما يحتاج إلى تأكيد."
                : "We share available property details transparently and clarify what needs confirmation."}
            </p>
          </article>
          <article>
            <span className="value-number">03</span>
            <h2>{locale === "ar" ? "خدمة شخصية" : "Personal service"}</h2>
            <p>
              {locale === "ar"
                ? "نبقى إلى جانبك خلال البحث والتواصل لاتخاذ الخطوة المناسبة."
                : "We stay by your side through your search and conversations to help you take the right next step."}
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
