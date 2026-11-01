import type { Locale } from "@al-ahmadi/shared";
import type { PublicListing } from "./api";

const WHATSAPP_E164 = "201004761901";

const typeLabels: Record<Locale, Record<PublicListing["type"], string>> = {
  ar: {
    apartment: "شقة",
    building: "مبنى",
    residential_unit: "وحدة سكنية",
    villa: "فيلا",
    land: "أرض",
  },
  en: {
    apartment: "apartment",
    building: "building",
    residential_unit: "residential unit",
    villa: "villa",
    land: "land",
  },
};

export function buildListingWhatsAppUrl(
  listing: PublicListing,
  locale: Locale,
  listingUrl: string,
) {
  const title = locale === "ar" ? listing.titleAr : listing.titleEn;
  const message =
    locale === "ar"
      ? `مرحباً، أود الاستفسار عن تفاصيل [${title} - كود ${listing.code} - ${typeLabels.ar[listing.type]}] المعروض على موقع الأحمدي للتسويق العقاري. ${listingUrl}`
      : `Hello, I would like to inquire about the details of [${title} - Code ${listing.code} - ${typeLabels.en[listing.type]}] listed on Al-ahmadi Real Estate Marketing. ${listingUrl}`;
  return `https://wa.me/${WHATSAPP_E164}?text=${encodeURIComponent(message)}`;
}

export function buildGenericWhatsAppUrl(locale: Locale) {
  const message =
    locale === "ar"
      ? "مرحباً، أود الاستفسار عن خدمات الأحمدي للتسويق العقاري."
      : "Hello, I would like to ask about Al-ahmadi Real Estate Marketing.";
  return `https://wa.me/${WHATSAPP_E164}?text=${encodeURIComponent(message)}`;
}
