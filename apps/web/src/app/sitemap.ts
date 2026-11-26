import { MetadataRoute } from "next";
import { getListings } from "../lib/api";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://al-ahmadi-real-estate-od57.vercel.app";

const LOCALES: readonly string[] = ["ar", "en"];

const STATIC_PATHS = ["", "/listings", "/about", "/contact"];

export default async function sitemap() {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    for (const path of STATIC_PATHS) {
      entries.push({
        url: `${BASE_URL}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: path === "" ? 1 : 0.8,
      });
    }
  }

  try {
    const response = await getListings({
      page: 1,
      limit: 1000,
      status: "available",
    });

    for (const listing of response.data) {
      for (const locale of LOCALES) {
        entries.push({
          url: `${BASE_URL}/${locale}/listings/${listing.slug}`,
          lastModified: listing.publishedAt
            ? new Date(listing.publishedAt)
            : new Date(),
          changeFrequency: "monthly",
          priority: 0.7,
        });
      }
    }
  } catch {
    // If API is unavailable during build, static entries still ship.
  }

  return entries;
}
