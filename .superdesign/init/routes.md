# Routes

All routes are under `apps/web/src/app/[locale]/` and render in Arabic (`ar`, RTL) or English (`en`, LTR) through the locale layout.

| URL                        | File                                     | Purpose                                                 |
| -------------------------- | ---------------------------------------- | ------------------------------------------------------- |
| `/:locale`                 | `app/[locale]/page.tsx`                  | Home hero, trust section, categories, featured listings |
| `/:locale/listings`        | `app/[locale]/listings/page.tsx`         | Search and listing grid                                 |
| `/:locale/listings/:slug`  | `app/[locale]/listings/[slug]/page.tsx`  | Listing details                                         |
| `/:locale/about`           | `app/[locale]/about/page.tsx`            | Company story                                           |
| `/:locale/contact`         | `app/[locale]/contact/page.tsx`          | Contact options                                         |
| `/:locale/login`           | `app/[locale]/login/page.tsx`            | Authentication                                          |
| `/:locale/register`        | `app/[locale]/register/page.tsx`         | Registration                                            |
| `/:locale/account`         | `app/[locale]/account/page.tsx`          | User account                                            |
| `/:locale/admin`           | `app/[locale]/admin/page.tsx`            | Admin dashboard                                         |
| `/:locale/admin/listings`  | `app/[locale]/admin/listings/page.tsx`   | Listing management                                      |
| `/:locale/legal/:document` | `app/[locale]/legal/[document]/page.tsx` | Legal documents                                         |

The admin subtree has its own layout and guarded dashboard/editor/audit components. `apps/web/src/middleware.ts` handles locale routing.
