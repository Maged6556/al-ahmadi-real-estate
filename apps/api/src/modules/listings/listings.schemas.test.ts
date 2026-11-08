import { describe, expect, it } from "vitest";
import {
  adminListingQuerySchema,
  createListingSchema,
  publicListingQuerySchema,
  updateListingSchema,
} from "./listings.schemas.js";
import { publicListingWhere } from "./listings.service.js";

const validListing = {
  code: "AH-1001",
  slug: "apartment-riyadh",
  type: "apartment",
  offer: "sale",
  titleAr: "شقة",
  titleEn: "Apartment",
  descriptionAr: "وصف",
  descriptionEn: "Description",
  city: "Riyadh",
};

describe("listing request schemas", () => {
  it("applies pagination defaults and caps public page size at 24", () => {
    expect(publicListingQuerySchema.parse({})).toMatchObject({
      page: 1,
      limit: 24,
    });
    expect(publicListingQuerySchema.parse({ limit: "24" }).limit).toBe(24);
    expect(publicListingQuerySchema.safeParse({ limit: "25" }).success).toBe(
      false,
    );
    expect(publicListingQuerySchema.safeParse({ page: "0" }).success).toBe(
      false,
    );
  });

  it("rejects unknown query and mutation fields, including any price field", () => {
    expect(
      publicListingQuerySchema.safeParse({ unexpected: "true" }).success,
    ).toBe(false);
    expect(
      adminListingQuerySchema.safeParse({ ownerAskingPrice: "100" }).success,
    ).toBe(false);
    expect(
      createListingSchema.safeParse({
        ...validListing,
        ownerAskingPrice: 100,
      }).success,
    ).toBe(false);
  });

  it("requires non-empty, valid listing updates", () => {
    expect(createListingSchema.parse(validListing).features).toEqual([]);
    expect(updateListingSchema.safeParse({}).success).toBe(false);
    expect(updateListingSchema.safeParse({ status: "sold" }).success).toBe(
      false,
    );
    expect(updateListingSchema.safeParse({ city: "Jeddah" }).success).toBe(
      true,
    );
    expect(
      createListingSchema.safeParse({
        ...validListing,
        slug: "../not-a-revalidation-tag",
      }).success,
    ).toBe(false);
  });

  it("validates and normalizes listing search filters", () => {
    expect(
      publicListingQuerySchema.parse({
        type: "villa",
        offer: "rent",
        city: "  Jeddah ",
        q: "  sea view ",
        page: "3",
        limit: "12",
      }),
    ).toMatchObject({
      type: "villa",
      offer: "rent",
      city: "Jeddah",
      q: "sea view",
      page: 3,
      limit: 12,
    });
  });

  it("keeps the other active filters when calculating per-type and per-offer facets", () => {
    const filters = publicListingQuerySchema.parse({
      type: "villa",
      offer: "rent",
      city: "Riyadh",
      status: "available",
      q: "garden",
    });

    expect(publicListingWhere(filters, "type")).toMatchObject({
      offer: "RENT",
      city: "Riyadh",
      status: "AVAILABLE",
    });
    expect(publicListingWhere(filters, "type")).not.toHaveProperty("type");
    expect(publicListingWhere(filters, "offer")).toMatchObject({
      type: "VILLA",
      city: "Riyadh",
      status: "AVAILABLE",
    });
    expect(publicListingWhere(filters, "offer")).not.toHaveProperty("offer");
  });
});
