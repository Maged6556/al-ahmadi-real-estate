# Page dependency trees

## Home (`/:locale`)

- `apps/web/src/app/[locale]/page.tsx`
  - `../../components/listing-grid.tsx`
    - `./listing-card.tsx`
  - `../../lib/api.ts`
  - `../../lib/i18n.ts`
  - `../../lib/route-locale.ts`
  - shared locale layout: `site-header.tsx`, `site-footer.tsx`, `cookie-consent.tsx`, `globals.css`

## Listings (`/:locale/listings`)

- `apps/web/src/app/[locale]/listings/page.tsx`
  - `../../components/listing-filters.tsx`
  - `../../components/listing-grid.tsx`
    - `../listing-card.tsx`
  - `../../lib/api.ts`
  - `../../lib/i18n.ts`

## Listing detail (`/:locale/listings/:slug`)

- `apps/web/src/app/[locale]/listings/[slug]/page.tsx`
  - `../../../components/listing-card.tsx`
  - `../../../lib/api.ts`
  - `../../../lib/i18n.ts`

## Admin dashboard (`/:locale/admin`)

- `apps/web/src/app/[locale]/admin/page.tsx`
  - `../../../components/admin-gate.tsx`
  - `../../../components/admin-dashboard.tsx`
  - `../../../lib/admin-api.ts`
  - admin layout and shared locale layout

## Authentication

- `login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`, `verify-email/page.tsx`
  - `../../../components/auth-form.tsx`
  - `../../../lib/i18n.ts`
  - shared locale layout
