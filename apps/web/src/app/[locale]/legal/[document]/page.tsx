import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMessages } from "../../../../lib/i18n";
import type { Messages } from "../../../../lib/i18n";
import { requireLocale } from "../../../../lib/route-locale";

type LegalDocument = "privacy" | "terms" | "cookies";

const legalDocuments: Record<
  LegalDocument,
  {
    title: keyof Messages["legal"];
    sections: Array<keyof Messages["legal"]>;
  }
> = {
  privacy: {
    title: "privacyTitle",
    sections: [
      "privacyIntro",
      "privacyAccounts",
      "privacyLogs",
      "privacyRetention",
      "privacyRights",
    ],
  },
  terms: { title: "termsTitle", sections: ["termsBody", "disclaimer"] },
  cookies: { title: "cookiesTitle", sections: ["cookiesBody"] },
};

function isLegalDocument(document: string): document is LegalDocument {
  return Object.hasOwn(legalDocuments, document);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; document: string }>;
}): Promise<Metadata> {
  const { locale: localeParam, document } = await params;
  const locale = requireLocale(localeParam);
  if (!isLegalDocument(document)) notFound();
  return {
    title: getMessages(locale).legal[legalDocuments[document].title],
  };
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ locale: string; document: string }>;
}) {
  const { locale: localeParam, document } = await params;
  const locale = requireLocale(localeParam);
  if (!isLegalDocument(document)) notFound();
  const messages = getMessages(locale);
  const policy = legalDocuments[document];

  return (
    <main id="main-content" className="page-main container legal-page">
      <p className="eyebrow">{messages.brand}</p>
      <h1>{messages.legal[policy.title]}</h1>
      <p className="legal-template">{messages.legal.template}</p>
      {policy.sections.map((section) => (
        <p key={section}>{messages.legal[section]}</p>
      ))}
    </main>
  );
}
