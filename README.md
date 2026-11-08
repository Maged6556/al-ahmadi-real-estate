# Al-ahmadi Real Estate Marketing

Bilingual real-estate marketing platform for Al-ahmadi. This repository is being delivered in phases; Phases 1–9 are implemented.

## Requirements

- Node.js 22 or newer
- pnpm 10.6.5 (the repository pins this with Corepack)
- Docker Compose v2 for the complete local stack

## Quick start

1. Copy `.env.example` to `.env`. Run `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` three times to generate separate secrets; fill `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, and `WEB_REVALIDATION_SECRET`. Use the same database password in `POSTGRES_PASSWORD`, `DATABASE_URL`, and `DIRECT_URL`.
2. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` before creating the first admin. Use a unique password of at least 10 characters.
3. Install the workspace dependencies: `corepack pnpm install`.
4. Run the complete development stack: `make dev`.
5. Create or update the initial admin account: `pnpm --filter @al-ahmadi/api db:seed`.
6. Open the web app at `http://localhost:3000`; the API health endpoint is `http://localhost:4000/healthz`.

The development database and Redis ports bind to loopback only. Compose requires unique secrets from `.env`; do not commit that file or reuse its credentials in production.

To run the apps directly on the host, start PostgreSQL 16 and Redis 7 locally, then run `pnpm dev`.

Cloudinary credentials are required to use media uploads and are mandatory in production. In development, leave `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` unset until a Cloudinary account is configured; media endpoints return a clear service-unavailable response in that case.

## Production operations (Phase 8)

Production images are built from the root context using the API and web multi-stage Dockerfiles. `docker-compose.prod.yml` runs PostgreSQL, password-protected Redis, the API, Next.js standalone server, and an Nginx TLS reverse proxy; only ports 80/443 are published. Use `.env.production.example` as a template, never as a live environment file. Set up DNS, TLS certificates, GHCR access, and GitHub Actions variables/secrets by following [DEPLOY.md](./DEPLOY.md).

The CI workflow runs dependency audit, lint, tests, typecheck, formatting, builds, and container builds. A successful `main` CI run triggers image publication, Trivy HIGH/CRITICAL scans, and an optional SSH deployment when the protected `production` environment is configured. Deployments use commit SHA tags, apply Prisma migrations, check liveness/readiness, and roll back to the last healthy image on a failed rollout. Database backups include SHA-256 checksums; the restore script only restores to a new isolated database and never overwrites the live database.

## Account, email, and privacy (Phase 9)

Registration requires acceptance of the localized Terms and Privacy templates and queues a 24-hour email-verification link. Password reset links are single-use, expire after 30 minutes, and revoke all refresh sessions. Email changes require confirmation at the new address; account settings also support profile/language changes, password changes, and account anonymization. Configure Resend (`RESEND_API_KEY`, verified `EMAIL_FROM`, and `WEB_BASE_URL`) to deliver messages; BullMQ retries delivery up to five times. Optional analytics/marketing cookies remain disabled unless the visitor consents; this release does not load analytics or marketing scripts. The localized legal pages are templates requiring owner/legal review. See [DATA-HANDLING.md](./DATA-HANDLING.md).

## Public website (Phase 6)

The public site is available in Arabic at `/ar` and English at `/en`; `/` redirects to the locale cookie or Arabic by default. It includes the home page, searchable and filterable listings, listing details, About, Contact, and login/registration pages. Set `NEXT_PUBLIC_SITE_URL` to the canonical public origin. Server-side listing requests use `API_INTERNAL_BASE_URL` (Compose sets this to `http://api:4000`); browser authentication uses `NEXT_PUBLIC_API_BASE_URL`.

Public listing cards and details do not expose prices or exact addresses. Listing inquiry and contact actions open WhatsApp using the configured business number. Cloudinary image URLs are enabled for Next.js image optimization. Public listing fetches are tagged for the existing API-triggered revalidation route.

## Admin dashboard (Phase 7)

The localized dashboard is available at `/ar/admin` and `/en/admin`. It verifies the current session through `GET /api/auth/me`; only ADMIN and EDITOR accounts can enter. The overview shows property, inquiry, WhatsApp, and grouped status/type/channel counts. Staff can search and filter the paginated listing table, create and edit bilingual listing details, change status, and publish or unpublish. Only ADMIN accounts can delete listings, manage images, or view the paginated audit history. API permissions remain authoritative for every operation.

Listing media uses the existing single-use image grants: administrators can drag-and-drop or select multiple JPEG, PNG, and WebP files, see upload progress, reorder media, select an image cover, and remove items. Admins can also link secure direct HTTPS MP4/WebM files; URLs are validated and are never fetched by the API. Editors can manage listing fields but cannot change media. `GET /api/admin/stats` is available to ADMIN/EDITOR; `GET /api/admin/audit` is ADMIN-only. Listing search/filter, page selection, bulk publish/status actions, and ADMIN-only bulk delete are available. State-changing browser requests include the CSRF header, and the media upload headers are allowed by the API CORS policy.

## Database

The Prisma schema and committed PostgreSQL migration live in `apps/api/prisma`. Development changes use `pnpm --filter @al-ahmadi/api db:migrate:dev`; deployments apply committed migrations with `pnpm --filter @al-ahmadi/api db:migrate:deploy`. Never use `prisma db push` in production.

The seed reads only `ADMIN_EMAIL` and `ADMIN_PASSWORD` from the environment, hashes the password with bcrypt cost 12, and creates an `ADMIN` only if that email does not already belong to a user. It never changes an existing account's role or password and does not create listings.

Active lead deduplication uses the nullable unique `activePhone` column: the lead service must set it to the normalized E.164 phone for active leads and clear it when a lead becomes won or lost. PostgreSQL allows multiple `NULL` values, so closed leads remain in history without blocking a future active lead.

## Authentication (Phase 3)

The API exposes `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/verify-email`, `POST /api/auth/forgot-password`, and `POST /api/auth/reset-password`. Account settings are served from `/api/account`; password/email changes and account deletion require the current password where applicable. Registration always assigns `USER`; the public API has no role-promotion path. Passwords must be at least 10 characters and no more than 72 UTF-8 bytes. Five failed logins lock an account for 15 minutes.

Access tokens expire within 10–15 minutes. Refresh tokens rotate on every refresh, only their SHA-256 hashes are stored, and reuse revokes the whole token family. Both tokens are delivered only in `HttpOnly`, `SameSite=Lax` cookies (also `Secure` in production); API JSON never returns the raw tokens. Cookie-authenticated state-changing requests must include `X-Requested-With: XMLHttpRequest`; browser origins are restricted to `CORS_ORIGIN`. Clients making cross-origin requests must enable credentials.

Rate limits use Redis: 300 API requests per 15 minutes per IP, 30 auth requests per 15 minutes, 10 login attempts per 15 minutes, and 5 registrations per hour. `TRUST_PROXY_HOPS` defaults to `0`; configure it only to match the exact number of trusted reverse proxies, never to trust arbitrary forwarded headers.

## Quality checks

- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`
- `pnpm format:check`

## Delivery status

- Phase 1: monorepo scaffold, shared package, API environment validation, and development Compose stack.
- Phase 2: Prisma domain schema, PostgreSQL migration, admin-only seed, and typed repository layer.
- Phase 3: register/login/logout/refresh/me, rotating hashed refresh sessions, RBAC middleware, and Redis-backed API/auth rate limits.
- Phase 4: public/admin listing APIs, server-side filters and facets, price-free public DTOs, audit logs, and on-demand cache revalidation.
- Phase 5: admin-only signed media grants, image validation/EXIF stripping, Cloudinary storage, media reorder/cover/delete, and upload audit records.
- Phase 6: bilingual public site, locale-aware routes, search/filter/pagination, listing details and WhatsApp inquiries, SEO metadata, responsive RTL/LTR presentation, and localized auth forms.
- Phase 7: localized admin dashboard, listing management, media controls, basic operational stats, and ADMIN-only audit history.
- Phase 8: multi-stage production images, isolated production Compose stack, Nginx TLS proxy, CI/CD with image scanning, health checks, SHA-based rollback, and backup/isolated restore tooling.
- Phase 9: queued verification and password-reset emails, account profile/security/deletion controls, localized legal templates, required registration consent, and a 12-month cookie-preference banner.
- Later phases will add the remaining planned integrations.

Public endpoints are `GET /api/listings` (type, offer, city, district, status, `q`, page, limit), `GET /api/listings/:slug`, and `GET /api/meta/filters`. Admin/EDITOR listing writes use `GET/POST /api/admin/listings`, `GET/PUT/DELETE /api/admin/listings/:id`, `PATCH /api/admin/listings/:id/status`, and `PATCH /api/admin/listings/:id/publish`; deletion is soft, and DELETE is ADMIN-only. State-changing requests require the auth CSRF header.

Listing search filters are applied by PostgreSQL through Prisma, with a stable newest-first order and a maximum page size of 24. `Listing_isPublished_deletedAt_createdAt_idx` supports published pagination; `Listing_status_type_offer_city_idx` and `Listing_city_district_idx` support structured filters; GIN trigram indexes support title/city/district substring search. Check plans on representative data with:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT "id", "slug", "createdAt"
FROM "Listing"
WHERE "isPublished" = true
  AND "deletedAt" IS NULL
  AND "status" = 'available'
  AND "type" = 'apartment'
  AND "offer" = 'sale'
  AND "city" = 'Riyadh'
ORDER BY "createdAt" DESC, "id" DESC
LIMIT 24;
```

Validate the <150 ms p95 target against a representative 10k-listing dataset; latency depends on deployment hardware, dataset, and filter selectivity, so it is not claimed as measured in development.

Admin listing mutations write an audit record in the same database transaction and request Next.js on-demand revalidation. This provides near-real-time page freshness, not websocket updates.

## Media uploads (Phase 5)

Images are uploaded through a short-lived, single-use grant bound to the authenticated ADMIN, listing, and declared MIME type. `POST /api/admin/media/sign` issues a five-minute grant; clients then send the raw file to the returned `uploadUrl` (`POST /api/admin/media`) as `application/octet-stream`, with `X-Upload-Token` and `X-Upload-Content-Type`. Both requests require the normal CSRF header. `MEDIA_MAX_IMAGE_BYTES`, `MEDIA_MAX_IMAGE_PIXELS`, and `MEDIA_MAX_PER_LISTING` configure limits (defaults: 10 MiB, 40 megapixels, and 20 media items per listing). Only JPEG, PNG, and WebP magic bytes are accepted. The API decodes and re-encodes accepted images as WebP with Sharp, stripping EXIF and other source metadata before sending them to Cloudinary. Cloudinary credentials are never sent to the browser, and images are served from Cloudinary rather than the application origin. An administrator may also link an HTTPS direct `.mp4` or `.webm` file with `POST /api/admin/media/video-link`; the API does not fetch external video URLs.

`DELETE /api/admin/media/:id` removes a media item and promotes the next ordered item if the cover was deleted. `PATCH /api/admin/media/reorder` requires the complete media list, contiguous sort positions, and exactly one cover. Listings are limited to 20 media items. Uploads, links, deletions, and reorder operations are audited and trigger on-demand page revalidation; updates are near-real-time, not websocket events. External video URLs are displayed as browser-native video sources; automatic video uploads are not supported.
