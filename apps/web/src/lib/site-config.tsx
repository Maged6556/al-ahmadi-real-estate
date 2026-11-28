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

export const FACEBOOK_SVG = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 2.04C6.5 2.04 2 6.53 2 12.07c0 4.52 3.27 8.26 7.62 9.13v-6.16H9v-2.51h2.61V8.29c0-2.22 1.45-3.42 3.43-3.42 1.0 0 1.92.16 2.16.34v2.77h-1.43c-.7 0-1.17.49-1.17.98v1.49h2.25l-.36 2.51h-1.89V20.2c3.95-.76 7-4.17 7-8.13 0-5.54-4.5-10.03-10.03-10.03" />
  </svg>
);
