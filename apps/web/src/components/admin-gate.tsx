"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createContext, useContext } from "react";
import type { Locale } from "@al-ahmadi/shared";
import { AdminApiError, adminRequest, type AdminUser } from "../lib/admin-api";
import { getMessages, localizedPath } from "../lib/i18n";
import { ThemeToggle } from "./theme-toggle";

const AdminUserContext = createContext<AdminUser | null>(null);

export function useAdminUser() {
  return useContext(AdminUserContext);
}

export function AdminGate({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const messages = getMessages(locale);
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    adminRequest<{ data: { user: AdminUser } }>("/api/auth/me")
      .then(({ data }) => {
        if (active) setUser(data.user);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof AdminApiError && cause.status === 401) {
          const next = encodeURIComponent(pathname || `/${locale}/admin`);
          router.replace(`/${locale}/login?next=${next}`);
          return;
        }
        setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [locale, pathname, router]);

  if (loading || (!user && !error)) {
    return (
      <main className="admin-loading" aria-live="polite">
        <span className="admin-spinner" aria-hidden="true" />
        {messages.admin.loading}
      </main>
    );
  }

  if (error) {
    return (
      <main className="admin-loading" role="alert">
        <p>{messages.admin.sessionError}</p>
        <button
          type="button"
          className="button button-primary"
          onClick={() => window.location.reload()}
        >
          {messages.common.tryAgain}
        </button>
      </main>
    );
  }

  if (!user || (user.role !== "ADMIN" && user.role !== "EDITOR")) {
    return (
      <main className="admin-loading" role="alert">
        <p>{messages.admin.forbidden}</p>
        <Link className="button button-outline" href={`/${locale}`}>
          {messages.nav.home}
        </Link>
      </main>
    );
  }

  return (
    <AdminUserContext.Provider value={user}>
      <div className="admin-shell" dir={locale === "ar" ? "rtl" : "ltr"}>
        <aside className="admin-sidebar">
          <div className="admin-sidebar-brand">
            <span className="brand-mark" aria-hidden="true">
              أ
            </span>
            <span>{messages.admin.title}</span>
          </div>
          <nav className="admin-nav" aria-label={messages.admin.title}>
            <Link href={`/${locale}/admin`} className="admin-nav-link">
              <span aria-hidden="true">▦</span>
              {messages.admin.dashboard}
            </Link>
            <Link href={`/${locale}/admin/listings`} className="admin-nav-link">
              <span aria-hidden="true">⌂</span>
              {messages.admin.listings}
            </Link>
            {user.role === "ADMIN" && (
              <Link href={`/${locale}/admin/audit`} className="admin-nav-link">
                <span aria-hidden="true">◷</span>
                {messages.admin.audit}
              </Link>
            )}
          </nav>
          <div className="admin-sidebar-user">
            <span className="admin-user-avatar" aria-hidden="true">
              {(user.name ?? user.email).slice(0, 1).toLocaleUpperCase()}
            </span>
            <span className="admin-user-info">
              <strong>{user.name || user.email}</strong>
              <small>{messages.admin.roles[user.role]}</small>
            </span>
            <button
              type="button"
              className="admin-logout"
              aria-label={messages.admin.logout}
              title={messages.admin.logout}
              onClick={async () => {
                try {
                  await adminRequest<void>("/api/auth/logout", {
                    method: "POST",
                    body: "{}",
                  });
                  router.replace(`/${locale}/login`);
                } catch {
                  setError(true);
                }
              }}
            >
              ↪
            </button>
          </div>
        </aside>
        <div className="admin-main">
          <header className="admin-topbar">
            <div>
              <p className="eyebrow">{messages.admin.title}</p>
              <strong>{user.name || user.email}</strong>
            </div>
            <div className="admin-top-actions">
              <ThemeToggle locale={locale} />
              <Link href={`/${locale}`} className="admin-public-link">
                {messages.admin.viewSite}
              </Link>
              <Link
                href={localizedPath(
                  locale === "ar" ? "en" : "ar",
                  pathname ?? "/admin",
                )}
                lang={locale === "ar" ? "en" : "ar"}
                className="locale-switch"
              >
                {locale === "ar" ? "English" : "العربية"}
              </Link>
            </div>
          </header>
          <main className="admin-content" id="main-content">
            {children}
          </main>
        </div>
      </div>
    </AdminUserContext.Provider>
  );
}
