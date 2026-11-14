import { describe, expect, it } from "vitest";
import {
  LEGAL_PRIVACY_VERSION,
  LEGAL_TERMS_VERSION,
  listingOfferSchema,
  listingStatusSchema,
  listingTypeSchema,
  localeSchema,
  userRoleSchema,
} from "./index.js";

describe("Shared Domain Schemas & Constants (Unit Testing)", () => {
  describe("Locales", () => {
    it("accepts valid supported locales", () => {
      expect(localeSchema.safeParse("ar").success).toBe(true);
      expect(localeSchema.safeParse("en").success).toBe(true);
    });

    it("rejects unsupported locales", () => {
      expect(localeSchema.safeParse("fr").success).toBe(false);
      expect(localeSchema.safeParse("").success).toBe(false);
      expect(localeSchema.safeParse(null).success).toBe(false);
    });
  });

  describe("User Roles", () => {
    it("strictly permits only ADMIN, EDITOR, and USER", () => {
      expect(userRoleSchema.safeParse("ADMIN").success).toBe(true);
      expect(userRoleSchema.safeParse("EDITOR").success).toBe(true);
      expect(userRoleSchema.safeParse("USER").success).toBe(true);
    });

    it("rejects unauthorized escalated roles", () => {
      expect(userRoleSchema.safeParse("SUPERADMIN").success).toBe(false);
      expect(userRoleSchema.safeParse("ROOT").success).toBe(false);
      expect(userRoleSchema.safeParse("guest").success).toBe(false);
    });
  });

  describe("Listing Types & Offers", () => {
    it("validates all 5 supported real estate types", () => {
      const validTypes = [
        "apartment",
        "building",
        "residential_unit",
        "villa",
        "land",
      ];
      for (const t of validTypes) {
        expect(listingTypeSchema.safeParse(t).success).toBe(true);
      }
    });

    it("rejects invalid listing types", () => {
      expect(listingTypeSchema.safeParse("hotel").success).toBe(false);
      expect(listingTypeSchema.safeParse("castle").success).toBe(false);
    });

    it("accepts only 'sale' and 'rent' offers", () => {
      expect(listingOfferSchema.safeParse("sale").success).toBe(true);
      expect(listingOfferSchema.safeParse("rent").success).toBe(true);
      expect(listingOfferSchema.safeParse("lease").success).toBe(false);
    });

    it("validates listing status lifecycle (available, sold, rented)", () => {
      expect(listingStatusSchema.safeParse("available").success).toBe(true);
      expect(listingStatusSchema.safeParse("sold").success).toBe(true);
      expect(listingStatusSchema.safeParse("rented").success).toBe(true);
      expect(listingStatusSchema.safeParse("pending").success).toBe(false);
    });
  });

  describe("Legal Versions", () => {
    it("ensures legal policy version strings are pinned and immutable", () => {
      expect(LEGAL_TERMS_VERSION).toBe("2026-11-v1");
      expect(LEGAL_PRIVACY_VERSION).toBe("2026-11-v1");
    });
  });
});
