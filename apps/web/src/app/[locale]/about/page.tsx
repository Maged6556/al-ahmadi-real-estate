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
              <span>{messages.about.experienceYears}</span>
              <small>{messages.about.experienceBadge}</small>
            </div>
            <span className="about-spark about-spark-one">✦</span>
            <span className="about-spark about-spark-two">✦</span>
          </div>
        </div>
      </section>
      <section className="section-block">
        <div className="container about-values">
          {messages.about.values.map((val) => (
            <article key={val.number}>
              <span className="value-number">{val.number}</span>
              <h2>{val.title}</h2>
              <p>{val.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
