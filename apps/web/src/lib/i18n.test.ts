import { describe, expect, it } from "vitest";
import { getMessages, isLocale, localizedPath } from "./i18n.js";

describe("Web i18n & Localization (Unit Testing)", () => {
  it("correctly identifies valid and invalid locales", () => {
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("es")).toBe(false);
    expect(isLocale("")).toBe(false);
  });

  it("retrieves complete message dictionaries for both languages", () => {
    const arMessages = getMessages("ar");
    const enMessages = getMessages("en");

    expect(arMessages.brand).toContain("الأحمدي");
    expect(enMessages.brand).toContain("Al-ahmadi");

    // Key navigational and theme strings
    expect(arMessages.nav.listings).toBe("العقارات");
    expect(enMessages.nav.listings).toBe("Properties");

    expect(arMessages.theme.dark).toBe("الوضع الداكن");
    expect(enMessages.theme.dark).toBe("Dark mode");
  });

  it("translates path segments seamlessly between locales", () => {
    expect(localizedPath("en", "/ar/listings")).toBe("/en/listings");
    expect(localizedPath("ar", "/en/contact")).toBe("/ar/contact");
    expect(localizedPath("en", "/listings")).toBe("/en/listings");
    expect(localizedPath("ar", "/")).toBe("/ar/");
  });

  it("preserves deep route parameters when translating", () => {
    expect(localizedPath("en", "/ar/listings/luxury-villa-101")).toBe(
      "/en/listings/luxury-villa-101",
    );
    expect(localizedPath("ar", "/en/admin/listings")).toBe(
      "/ar/admin/listings",
    );
  });
});
