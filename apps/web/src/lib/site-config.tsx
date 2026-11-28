export const siteConfig = {
  name: {
    ar: "الأحمدي للتسويق العقاري",
    en: "Al-ahmadi Real Estate Marketing",
  },
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://al-ahmadi-real-estate-od57.vercel.app",
  phone: "+201004761901",
  social: {
    facebook: "https://www.facebook.com/profile.php?id=100063926743207",
  },
} as const;

export type SiteConfig = typeof siteConfig;
