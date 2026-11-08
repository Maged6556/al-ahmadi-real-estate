"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@al-ahmadi/shared";
import { adminRequest } from "../lib/admin-api";
import { getMessages } from "../lib/i18n";

type Stats = {
  listings: {
    total: number;
    published: number;
    byStatus: { value: string; count: number }[];
    byType: { value: string; count: number }[];
  };
  inquiries: {
    total: number;
    whatsappClicks: number;
    byChannel: { value: string; count: number }[];
  };
};

export function AdminDashboard({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    adminRequest<{ data: Stats }>("/api/admin/stats")
      .then(({ data }) => {
        if (active) setStats(data);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">{messages.admin.title}</p>
          <h1>{messages.admin.welcome}</h1>
          <p>{messages.admin.welcomeText}</p>
        </div>
        <Link
          href={`/${locale}/admin/listings/new`}
          className="button button-primary"
        >
          + {messages.admin.newListing}
        </Link>
      </div>

      {failed && (
        <div className="inline-error" role="alert">
          {messages.admin.loadError}
        </div>
      )}
      {!stats && !failed ? (
        <div className="admin-loading-inline" aria-live="polite">
          <span className="admin-spinner" aria-hidden="true" />
          {messages.admin.loading}
        </div>
      ) : stats ? (
        <>
          <div className="admin-stat-grid">
            <StatCard
              label={messages.admin.totalListings}
              value={stats.listings.total}
              icon="⌂"
            />
            <StatCard
              label={messages.admin.publishedListings}
              value={stats.listings.published}
              icon="↗"
            />
            <StatCard
              label={messages.admin.inquiries}
              value={stats.inquiries.total}
              icon="✉"
            />
            <StatCard
              label={messages.admin.whatsappClicks}
              value={stats.inquiries.whatsappClicks}
              icon="◉"
            />
          </div>

          <div className="admin-overview-grid">
            <BreakdownCard
              title={messages.admin.statusBreakdown}
              entries={stats.listings.byStatus.map(({ value, count }) => ({
                label:
                  {
                    AVAILABLE: messages.admin.available,
                    SOLD: messages.admin.sold,
                    RENTED: messages.admin.rented,
                  }[value] ?? value,
                value: count,
              }))}
            />
            <BreakdownCard
              title={messages.admin.typeBreakdown}
              entries={stats.listings.byType.map(({ value, count }) => ({
                label:
                  {
                    APARTMENT: messages.admin.apartment,
                    BUILDING: messages.admin.building,
                    RESIDENTIAL_UNIT: messages.admin.residential_unit,
                    VILLA: messages.admin.villa,
                    LAND: messages.admin.land,
                  }[value] ?? value,
                value: count,
              }))}
            />
            <BreakdownCard
              title={messages.admin.channelBreakdown}
              entries={stats.inquiries.byChannel.map(({ value, count }) => ({
                label: value,
                value: count,
              }))}
            />
          </div>
        </>
      ) : null}

      <section className="admin-quick-link">
        <div>
          <h2>{messages.admin.manageListings}</h2>
          <p>{messages.admin.welcomeText}</p>
        </div>
        <Link
          href={`/${locale}/admin/listings`}
          className="button button-outline"
        >
          {messages.admin.listings} <span aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <article className="admin-stat-card">
      <div className="admin-stat-icon" aria-hidden="true">
        {icon}
      </div>
      <p>{label}</p>
      <strong>{value.toLocaleString()}</strong>
    </article>
  );
}

function BreakdownCard({
  title,
  entries,
}: {
  title: string;
  entries: { label: string; value: number }[];
}) {
  const maximum = Math.max(1, ...entries.map(({ value }) => value));
  return (
    <article className="admin-breakdown-card">
      <h2>{title}</h2>
      {entries.length === 0 ? (
        <p className="admin-muted">—</p>
      ) : (
        <ul className="admin-breakdown-list">
          {entries.map(({ label, value }) => (
            <li key={label}>
              <div className="admin-breakdown-label">
                <span>{label}</span>
                <strong>{value.toLocaleString()}</strong>
              </div>
              <span className="admin-meter">
                <span style={{ width: `${(value / maximum) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
