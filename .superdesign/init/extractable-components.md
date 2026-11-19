# Extractable components

## SiteHeader

- Source: `apps/web/src/components/site-header.tsx`
- Category: layout
- Description: Branded navigation with locale, account, and theme controls.
- Extractable props: `locale`
- Hardcoded: logo asset, nav structure, class names.

## SiteFooter

- Source: `apps/web/src/components/site-footer.tsx`
- Category: layout
- Description: Footer navigation, legal links, contact affordance, and license note.
- Extractable props: `locale`
- Hardcoded: footer structure and visual treatment.

## ListingCard

- Source: `apps/web/src/components/listing-card.tsx`
- Category: basic
- Description: Property preview card with image, metadata, price, and link.
- Extractable props: listing data and `locale`.

## ListingGrid

- Source: `apps/web/src/components/listing-grid.tsx`
- Category: basic
- Description: Responsive collection layout for listing cards.
- Extractable props: listings and `locale`.

## AuthForm

- Source: `apps/web/src/components/auth-form.tsx`
- Category: basic
- Description: Shared login, registration, and recovery form presentation.
- Extractable props: mode, locale, and callback state.

## ThemeToggle

- Source: `apps/web/src/components/theme-toggle.tsx`
- Category: basic
- Description: Light/dark theme switcher.
- Extractable props: `locale`.
