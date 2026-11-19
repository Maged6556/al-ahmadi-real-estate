import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle Component (Unit Testing)", () => {
  it("renders with correct accessibility attributes in Arabic", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ThemeToggle, { locale: "ar" }),
    );

    expect(markup).toContain('class="theme-toggle"');
    expect(markup).toContain('aria-label="التبديل إلى الوضع الداكن"');
    // No SVG during SSR to avoid hydration mismatch; icon renders client-side
    expect(markup).not.toContain("<svg");
  });

  it("renders with correct accessibility attributes in English", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ThemeToggle, { locale: "en" }),
    );

    expect(markup).toContain('class="theme-toggle"');
    expect(markup).toContain('aria-label="Switch to dark mode"');
    expect(markup).not.toContain("<svg");
  });

  it("accepts custom className and maintains semantic button tag", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ThemeToggle, {
        locale: "ar",
        className: "custom-header-toggle",
      }),
    );

    expect(markup).toContain('class="theme-toggle custom-header-toggle"');
    expect(markup).toContain('type="button"');
  });
});
