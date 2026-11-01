"use client";

import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@al-ahmadi/shared";
import { adminRequest } from "../lib/admin-api";
import { getMessages } from "../lib/i18n";

type AuditEntry = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  diff: unknown;
  createdAt: string;
  actor: { id: string; name: string | null; email: string } | null;
};

type AuditPage = {
  data: AuditEntry[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export function AdminAudit({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  const [data, setData] = useState<AuditEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminRequest<AuditPage>(
        `/api/admin/audit?page=${page}&limit=20`,
      );
      setData(response.data);
      setTotalPages(Math.max(1, response.meta.totalPages));
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">{messages.admin.title}</p>
          <h1>{messages.admin.auditTitle}</h1>
          <p>{messages.admin.auditDescription}</p>
        </div>
      </div>

      {failed && (
        <div className="inline-error" role="alert">
          {messages.admin.auditLoadError}
          <button
            type="button"
            className="text-button"
            onClick={() => void load()}
          >
            {messages.common.tryAgain}
          </button>
        </div>
      )}
      <div className="admin-table-wrap">
        <table className="admin-table admin-audit-table">
          <thead>
            <tr>
              <th>{messages.admin.auditAction}</th>
              <th>{messages.admin.auditEntity}</th>
              <th>{messages.admin.auditActor}</th>
              <th>{messages.admin.auditDate}</th>
              <th>{messages.admin.auditDetails}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>
                  <span className="admin-inline-spinner">
                    <span className="admin-spinner" aria-hidden="true" />
                    {messages.admin.loading}
                  </span>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-table-empty">
                  {messages.admin.auditEmpty}
                </td>
              </tr>
            ) : (
              data.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <strong>{entry.action}</strong>
                  </td>
                  <td>
                    <span>{entry.entity}</span>
                    {entry.entityId && <small>{entry.entityId}</small>}
                  </td>
                  <td>
                    {entry.actor?.name ||
                      entry.actor?.email ||
                      messages.admin.unknown}
                  </td>
                  <td>
                    <time dateTime={entry.createdAt}>
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(entry.createdAt))}
                    </time>
                  </td>
                  <td>
                    <code className="admin-audit-diff">
                      {JSON.stringify(entry.diff ?? {})}
                    </code>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="admin-pagination">
        <button
          type="button"
          className="button button-outline"
          disabled={page <= 1 || loading}
          onClick={() => setPage((value) => value - 1)}
        >
          {messages.admin.previous}
        </button>
        <span>
          {messages.admin.page} {page} / {totalPages}
        </span>
        <button
          type="button"
          className="button button-outline"
          disabled={page >= totalPages || loading}
          onClick={() => setPage((value) => value + 1)}
        >
          {messages.admin.next}
        </button>
      </div>
    </div>
  );
}
