"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Locale } from "@al-ahmadi/shared";
import { adminRequest, type AdminListing } from "../lib/admin-api";
import { getMessages } from "../lib/i18n";
import { useAdminUser } from "./admin-gate";

type ListingPage = {
  data: AdminListing[];
  meta: { page: number; total: number; totalPages: number };
};

export function AdminListings({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  const user = useAdminUser();
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [published, setPublished] = useState("");
  const [type, setType] = useState("");
  const [offer, setOffer] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] =
    useState<AdminListing["status"]>("available");
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("q", search);
    if (status) params.set("status", status);
    if (published) params.set("isPublished", published);
    if (type) params.set("type", type);
    if (offer) params.set("offer", offer);
    try {
      const response = await adminRequest<ListingPage>(
        `/api/admin/listings?${params.toString()}`,
      );
      setListings(response.data);
      setTotalPages(Math.max(1, response.meta.totalPages));
      setFailure(false);
    } catch {
      setFailure(true);
    } finally {
      setLoading(false);
    }
  }, [offer, page, published, search, status, type]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [offer, page, published, search, status, type]);

  async function mutateListing(
    listing: AdminListing,
    path: string,
    init: RequestInit,
    successMessage: string,
  ) {
    setBusyId(listing.id);
    setFeedback("");
    try {
      await adminRequest(`/api/admin/listings/${listing.id}${path}`, init);
      setFeedback(successMessage);
      await load();
    } catch {
      setFeedback(messages.admin.actionError);
    } finally {
      setBusyId(null);
    }
  }

  async function deleteListing(listing: AdminListing) {
    if (!window.confirm(messages.admin.deleteConfirm)) return;
    setBusyId(listing.id);
    setFeedback("");
    try {
      await adminRequest(`/api/admin/listings/${listing.id}`, {
        method: "DELETE",
        body: "{}",
      });
      setFeedback(messages.admin.deleteSuccess);
      if (listings.length === 1 && page > 1) setPage(page - 1);
      else await load();
    } catch {
      setFeedback(messages.admin.actionError);
    } finally {
      setBusyId(null);
    }
  }

  async function runBulkAction(
    action: "status" | "publish" | "unpublish" | "delete",
  ) {
    const selected = listings.filter(({ id }) => selectedIds.has(id));
    if (selected.length === 0) return;
    if (
      action === "delete" &&
      !window.confirm(messages.admin.bulkDeleteConfirm)
    ) {
      return;
    }

    setBulkBusy(true);
    setFeedback("");
    let completed = 0;
    for (const listing of selected) {
      try {
        if (action === "delete") {
          await adminRequest(`/api/admin/listings/${listing.id}`, {
            method: "DELETE",
            body: "{}",
          });
        } else if (action === "status") {
          await adminRequest(`/api/admin/listings/${listing.id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: bulkStatus }),
          });
        } else {
          await adminRequest(`/api/admin/listings/${listing.id}/publish`, {
            method: "PATCH",
            body: JSON.stringify({ isPublished: action === "publish" }),
          });
        }
        completed += 1;
      } catch {
        continue;
      }
    }
    setFeedback(
      messages.admin.bulkResult
        .replace("{completed}", String(completed))
        .replace("{total}", String(selected.length)),
    );
    setSelectedIds(new Set());
    await load();
    setBulkBusy(false);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(query.trim());
  }

  const statusLabel = (value: AdminListing["status"]) =>
    ({
      available: messages.admin.available,
      sold: messages.admin.sold,
      rented: messages.admin.rented,
    })[value];

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">{messages.admin.dashboard}</p>
          <h1>{messages.admin.listings}</h1>
        </div>
        <Link
          href={`/${locale}/admin/listings/new`}
          className="button button-primary"
        >
          + {messages.admin.newListing}
        </Link>
      </div>

      <form className="admin-filters" onSubmit={submitSearch}>
        <label className="admin-search">
          <span className="visually-hidden">{messages.admin.search}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={messages.admin.search}
          />
        </label>
        <label>
          <span className="visually-hidden">{messages.admin.filterStatus}</span>
          <select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
          >
            <option value="">{messages.admin.all}</option>
            <option value="available">{messages.admin.available}</option>
            <option value="sold">{messages.admin.sold}</option>
            <option value="rented">{messages.admin.rented}</option>
          </select>
        </label>
        <label>
          <span className="visually-hidden">{messages.admin.type}</span>
          <select
            value={type}
            onChange={(event) => {
              setPage(1);
              setType(event.target.value);
            }}
          >
            <option value="">{messages.admin.type}</option>
            <option value="apartment">{messages.admin.apartment}</option>
            <option value="building">{messages.admin.building}</option>
            <option value="residential_unit">
              {messages.admin.residential_unit}
            </option>
            <option value="villa">{messages.admin.villa}</option>
            <option value="land">{messages.admin.land}</option>
          </select>
        </label>
        <label>
          <span className="visually-hidden">{messages.admin.offer}</span>
          <select
            value={offer}
            onChange={(event) => {
              setPage(1);
              setOffer(event.target.value);
            }}
          >
            <option value="">{messages.admin.offer}</option>
            <option value="sale">{messages.admin.sale}</option>
            <option value="rent">{messages.admin.rent}</option>
          </select>
        </label>
        <label>
          <span className="visually-hidden">
            {messages.admin.filterPublished}
          </span>
          <select
            value={published}
            onChange={(event) => {
              setPage(1);
              setPublished(event.target.value);
            }}
          >
            <option value="">{messages.admin.all}</option>
            <option value="true">{messages.admin.published}</option>
            <option value="false">{messages.admin.draft}</option>
          </select>
        </label>
        <button className="button button-outline" type="submit">
          {messages.listings.search}
        </button>
      </form>

      {selectedIds.size > 0 && (
        <div className="admin-bulk-actions">
          <strong>
            {messages.admin.bulkSelected.replace(
              "{count}",
              String(selectedIds.size),
            )}
          </strong>
          <label>
            <span className="visually-hidden">{messages.admin.bulkStatus}</span>
            <select
              value={bulkStatus}
              onChange={(event) =>
                setBulkStatus(event.target.value as AdminListing["status"])
              }
            >
              <option value="available">{messages.admin.available}</option>
              <option value="sold">{messages.admin.sold}</option>
              <option value="rented">{messages.admin.rented}</option>
            </select>
          </label>
          <button
            type="button"
            className="table-action"
            disabled={bulkBusy}
            onClick={() => void runBulkAction("status")}
          >
            {messages.admin.applyBulkStatus}
          </button>
          <button
            type="button"
            className="table-action"
            disabled={bulkBusy}
            onClick={() => void runBulkAction("publish")}
          >
            {messages.admin.bulkPublish}
          </button>
          <button
            type="button"
            className="table-action"
            disabled={bulkBusy}
            onClick={() => void runBulkAction("unpublish")}
          >
            {messages.admin.bulkUnpublish}
          </button>
          {user?.role === "ADMIN" && (
            <button
              type="button"
              className="table-action table-action-danger"
              disabled={bulkBusy}
              onClick={() => void runBulkAction("delete")}
            >
              {messages.admin.bulkDelete}
            </button>
          )}
        </div>
      )}

      {failure && (
        <div className="inline-error" role="alert">
          {messages.admin.loadError}
          <button
            type="button"
            className="text-button"
            onClick={() => void load()}
          >
            {messages.common.tryAgain}
          </button>
        </div>
      )}
      {feedback && (
        <p className="form-feedback" role="status">
          {feedback}
        </p>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label={messages.admin.selectAll}
                  checked={
                    listings.length > 0 &&
                    listings.every(({ id }) => selectedIds.has(id))
                  }
                  onChange={(event) =>
                    setSelectedIds(
                      event.target.checked
                        ? new Set(listings.map(({ id }) => id))
                        : new Set(),
                    )
                  }
                />
              </th>
              <th>{messages.admin.code}</th>
              <th>{messages.admin.listingTitle}</th>
              <th>{messages.admin.city}</th>
              <th>{messages.admin.status}</th>
              <th>{messages.admin.publication}</th>
              <th>{messages.admin.updated}</th>
              <th>{messages.admin.actions}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8}>
                  <span className="admin-inline-spinner">
                    <span className="admin-spinner" aria-hidden="true" />
                    {messages.admin.loading}
                  </span>
                </td>
              </tr>
            ) : listings.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-table-empty">
                  {messages.admin.noListings}
                </td>
              </tr>
            ) : (
              listings.map((listing) => (
                <tr key={listing.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`${messages.admin.listingTitle}: ${listing.code}`}
                      checked={selectedIds.has(listing.id)}
                      onChange={(event) =>
                        setSelectedIds((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(listing.id);
                          else next.delete(listing.id);
                          return next;
                        })
                      }
                    />
                  </td>
                  <td className="admin-code">{listing.code}</td>
                  <td>
                    <strong>
                      {locale === "ar" ? listing.titleAr : listing.titleEn}
                    </strong>
                    <small>{listing.slug}</small>
                  </td>
                  <td>{listing.city}</td>
                  <td>
                    <span className={`admin-status status-${listing.status}`}>
                      {statusLabel(listing.status)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`admin-status ${listing.isPublished ? "status-published" : "status-draft"}`}
                    >
                      {listing.isPublished
                        ? messages.admin.published
                        : messages.admin.draft}
                    </span>
                  </td>
                  <td>
                    <time dateTime={listing.updatedAt}>
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                      }).format(new Date(listing.updatedAt))}
                    </time>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <Link
                        href={`/${locale}/admin/listings/${listing.id}`}
                        className="table-action"
                      >
                        {messages.admin.edit}
                      </Link>
                      <button
                        type="button"
                        className="table-action"
                        disabled={busyId === listing.id}
                        onClick={() =>
                          void mutateListing(
                            listing,
                            "/publish",
                            {
                              method: "PATCH",
                              body: JSON.stringify({
                                isPublished: !listing.isPublished,
                              }),
                            },
                            messages.admin.actionSuccess,
                          )
                        }
                      >
                        {listing.isPublished
                          ? messages.admin.unpublish
                          : messages.admin.publish}
                      </button>
                      {listing.status === "available" ? (
                        <>
                          <button
                            type="button"
                            className="table-action"
                            disabled={busyId === listing.id}
                            onClick={() =>
                              void mutateListing(
                                listing,
                                "/status",
                                {
                                  method: "PATCH",
                                  body: JSON.stringify({ status: "sold" }),
                                },
                                messages.admin.actionSuccess,
                              )
                            }
                          >
                            {messages.admin.markSold}
                          </button>
                          <button
                            type="button"
                            className="table-action"
                            disabled={busyId === listing.id}
                            onClick={() =>
                              void mutateListing(
                                listing,
                                "/status",
                                {
                                  method: "PATCH",
                                  body: JSON.stringify({ status: "rented" }),
                                },
                                messages.admin.actionSuccess,
                              )
                            }
                          >
                            {messages.admin.markRented}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="table-action"
                          disabled={busyId === listing.id}
                          onClick={() =>
                            void mutateListing(
                              listing,
                              "/status",
                              {
                                method: "PATCH",
                                body: JSON.stringify({ status: "available" }),
                              },
                              messages.admin.actionSuccess,
                            )
                          }
                        >
                          {messages.admin.markAvailable}
                        </button>
                      )}
                      {user?.role === "ADMIN" && (
                        <button
                          type="button"
                          className="table-action table-action-danger"
                          disabled={busyId === listing.id}
                          onClick={() => void deleteListing(listing)}
                        >
                          {messages.admin.delete}
                        </button>
                      )}
                    </div>
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
