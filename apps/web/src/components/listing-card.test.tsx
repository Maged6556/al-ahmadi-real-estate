import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PublicListing } from "../lib/api";

vi.mock("next/image", () => ({ default: "img" }));
vi.mock("next/link", () => ({ default: "a" }));
vi.mock("server-only", () => ({}));

import { ListingCard } from "./listing-card";

const listing: PublicListing = {
  code: "AH-1001",
  slug: "sample-home",
  type: "apartment",
  offer: "sale",
  status: "available",
  titleAr: "شقة للاختبار",
  titleEn: "Sample apartment",
  descriptionAr: "وصف تجريبي",
  descriptionEn: "Sample description",
  city: "Cairo",
  district: "Nasr City",
  areaSqm: 120,
  bedrooms: 2,
  bathrooms: 1,
  floor: null,
  features: [],
  publishedAt: null,
  media: [],
};

describe("public listing card", () => {
  it("renders no price data or currency values", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ListingCard, { listing, locale: "en" }),
    );

    expect(Object.hasOwn(listing, "price")).toBe(false);
    expect(markup).not.toMatch(/\b(?:EGP|USD|EUR|GBP)\b|جنيه|ج\.م/i);
    expect(markup).not.toMatch(/\bprice\b|السعر/i);
    expect(markup).toContain("Sample apartment");
  });
});
