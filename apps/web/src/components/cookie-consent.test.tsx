import { describe, expect, it } from "vitest";
import { parseConsentCookie } from "./cookie-consent.js";

describe("cookie consent", () => {
  it("accepts only well-formed, unexpired choices", () => {
    const expiresAt = 2_000;
    const encoded = encodeURIComponent(
      JSON.stringify({ analytics: true, marketing: false, expiresAt }),
    );

    expect(parseConsentCookie(encoded, 1_000)).toEqual({
      analytics: true,
      marketing: false,
      expiresAt,
    });
    expect(parseConsentCookie(encoded, expiresAt)).toBeNull();
    expect(parseConsentCookie("%7Bbad-json", 1_000)).toBeNull();
    expect(
      parseConsentCookie(
        encodeURIComponent(
          JSON.stringify({ analytics: true, marketing: false }),
        ),
        1_000,
      ),
    ).toBeNull();
  });
});
