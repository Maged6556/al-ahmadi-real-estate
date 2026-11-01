import { z } from "zod";

export const LEGAL_TERMS_VERSION = "2026-11-v1";
export const LEGAL_PRIVACY_VERSION = "2026-11-v1";

export const localeSchema = z.enum(["ar", "en"]);
export type Locale = z.infer<typeof localeSchema>;

export const userRoleSchema = z.enum(["ADMIN", "EDITOR", "USER"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const listingTypeSchema = z.enum([
  "apartment",
  "building",
  "residential_unit",
  "villa",
  "land",
]);
export type ListingType = z.infer<typeof listingTypeSchema>;

export const listingOfferSchema = z.enum(["sale", "rent"]);
export type ListingOffer = z.infer<typeof listingOfferSchema>;

export const listingStatusSchema = z.enum(["available", "sold", "rented"]);
export type ListingStatus = z.infer<typeof listingStatusSchema>;
