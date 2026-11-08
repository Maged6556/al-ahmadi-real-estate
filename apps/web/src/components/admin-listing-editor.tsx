"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Locale } from "@al-ahmadi/shared";
import {
  adminRequest,
  type AdminListing,
  type AdminListingInput,
} from "../lib/admin-api";
import { getMessages } from "../lib/i18n";
import { AdminMediaManager } from "./admin-media-manager";

type Fields = Omit<
  AdminListingInput,
  | "features"
  | "slug"
  | "district"
  | "addressText"
  | "latitude"
  | "longitude"
  | "areaSqm"
  | "bedrooms"
  | "bathrooms"
  | "floor"
> & {
  district: string;
  addressText: string;
  areaSqm: string;
  bedrooms: string;
  bathrooms: string;
  floor: string;
  latitude: string;
  longitude: string;
  features: string;
};

function emptyFields(): Fields {
  return {
    code: "",
    type: "apartment",
    offer: "sale",
    titleAr: "",
    titleEn: "",
    descriptionAr: "",
    descriptionEn: "",
    city: "",
    district: "",
    addressText: "",
    latitude: "",
    longitude: "",
    areaSqm: "",
    bedrooms: "",
    bathrooms: "",
    floor: "",
    features: "",
  };
}

function optionalNumber(value: string) {
  return value.trim() === "" ? null : Number(value);
}

function createListingSlug(title: string, code: string) {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const titleSlug = normalize(title).slice(0, 110).replace(/-+$/g, "");
  const codeSlug = normalize(code).slice(0, 40).replace(/-+$/g, "");

  return `${titleSlug || "property"}-${codeSlug || "listing"}-${crypto.randomUUID().slice(0, 8)}`;
}

function listingFields(listing: AdminListing): Fields {
  return {
    code: listing.code,
    type: listing.type,
    offer: listing.offer,
    titleAr: listing.titleAr,
    titleEn: listing.titleEn,
    descriptionAr: listing.descriptionAr,
    descriptionEn: listing.descriptionEn,
    city: listing.city,
    district: listing.district ?? "",
    addressText: listing.addressText ?? "",
    latitude: listing.latitude?.toString() ?? "",
    longitude: listing.longitude?.toString() ?? "",
    areaSqm: listing.areaSqm?.toString() ?? "",
    bedrooms: listing.bedrooms?.toString() ?? "",
    bathrooms: listing.bathrooms?.toString() ?? "",
    floor: listing.floor?.toString() ?? "",
    features: listing.features.join("\n"),
  };
}

export function AdminListingEditor({
  locale,
  listingId,
}: {
  locale: Locale;
  listingId?: string;
}) {
  const messages = getMessages(locale);
  const router = useRouter();
  const [fields, setFields] = useState<Fields>(emptyFields);
  const [listing, setListing] = useState<AdminListing | null>(null);
  const [loading, setLoading] = useState(Boolean(listingId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!listingId) return;
    let active = true;
    adminRequest<{ data: AdminListing }>(`/api/admin/listings/${listingId}`)
      .then(({ data }) => {
        if (!active) return;
        setListing(data);
        setFields(listingFields(data));
      })
      .catch(() => {
        if (active) setError(messages.admin.loadError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [listingId, messages.admin.loadError]);

  function setField<Key extends keyof Fields>(key: Key, value: Fields[Key]) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const input: AdminListingInput = {
      code: fields.code.trim(),
      slug: listing?.slug ?? createListingSlug(fields.titleEn, fields.code),
      type: fields.type,
      offer: fields.offer,
      titleAr: fields.titleAr.trim(),
      titleEn: fields.titleEn.trim(),
      descriptionAr: fields.descriptionAr.trim(),
      descriptionEn: fields.descriptionEn.trim(),
      city: fields.city.trim(),
      district: fields.district.trim() || null,
      addressText: fields.addressText.trim() || null,
      latitude: optionalNumber(fields.latitude),
      longitude: optionalNumber(fields.longitude),
      areaSqm: optionalNumber(fields.areaSqm),
      bedrooms: optionalNumber(fields.bedrooms),
      bathrooms: optionalNumber(fields.bathrooms),
      floor: optionalNumber(fields.floor),
      features: fields.features
        .split("\n")
        .map((feature) => feature.trim())
        .filter(Boolean),
    };

    try {
      const response = listingId
        ? await adminRequest<{ data: AdminListing }>(
            `/api/admin/listings/${listingId}`,
            { method: "PUT", body: JSON.stringify(input) },
          )
        : await adminRequest<{ data: AdminListing }>("/api/admin/listings", {
            method: "POST",
            body: JSON.stringify(input),
          });
      setListing(response.data);
      setSuccess(
        listingId ? messages.admin.updateSuccess : messages.admin.createSuccess,
      );
      if (!listingId) {
        router.replace(`/${locale}/admin/listings/${response.data.id}`);
      }
    } catch {
      setError(messages.admin.saveError);
    } finally {
      setSaving(false);
    }
  }

  const textField = (
    key: keyof Fields,
    label: string,
    options: {
      required?: boolean;
      type?: string;
      min?: string;
      max?: string;
    } = {},
  ) => (
    <label className="admin-field" key={key}>
      <span>{label}</span>
      <input
        name={key}
        type={options.type ?? "text"}
        value={fields[key] as string}
        required={options.required}
        min={options.min}
        max={options.max}
        onChange={(event) => setField(key, event.target.value)}
      />
    </label>
  );

  if (loading) {
    return (
      <div className="admin-loading-inline">
        <span className="admin-spinner" aria-hidden="true" />
        {messages.admin.loading}
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">{messages.admin.listings}</p>
          <h1>
            {listingId ? messages.admin.editListing : messages.admin.newListing}
          </h1>
        </div>
        <Link
          href={`/${locale}/admin/listings`}
          className="button button-outline"
        >
          {messages.admin.cancel}
        </Link>
      </div>

      {error && (
        <div className="inline-error" role="alert">
          {error}
        </div>
      )}
      {success && (
        <p className="form-feedback form-success" role="status">
          {success}
        </p>
      )}

      <form className="admin-editor-form" onSubmit={submit}>
        <section className="admin-form-section">
          <h2>{messages.admin.listingDetails}</h2>
          <div className="admin-form-grid">
            {textField("code", messages.admin.code, { required: true })}
            <label className="admin-field">
              <span>{messages.admin.type}</span>
              <select
                value={fields.type}
                onChange={(event) =>
                  setField("type", event.target.value as Fields["type"])
                }
              >
                {(
                  [
                    "apartment",
                    "building",
                    "residential_unit",
                    "villa",
                    "land",
                  ] as const
                ).map((type) => (
                  <option key={type} value={type}>
                    {messages.admin[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>{messages.admin.offer}</span>
              <select
                value={fields.offer}
                onChange={(event) =>
                  setField("offer", event.target.value as Fields["offer"])
                }
              >
                <option value="sale">{messages.admin.sale}</option>
                <option value="rent">{messages.admin.rent}</option>
              </select>
            </label>
            {textField("city", messages.admin.city, { required: true })}
            {textField("district", messages.admin.district)}
            {textField("titleAr", messages.admin.titleAr, { required: true })}
            {textField("titleEn", messages.admin.titleEn, { required: true })}
            <label className="admin-field admin-field-full">
              <span>{messages.admin.descriptionAr}</span>
              <textarea
                value={fields.descriptionAr}
                required
                maxLength={10000}
                rows={5}
                onChange={(event) =>
                  setField("descriptionAr", event.target.value)
                }
              />
            </label>
            <label className="admin-field admin-field-full">
              <span>{messages.admin.descriptionEn}</span>
              <textarea
                value={fields.descriptionEn}
                required
                maxLength={10000}
                rows={5}
                onChange={(event) =>
                  setField("descriptionEn", event.target.value)
                }
              />
            </label>
            {textField("addressText", messages.admin.address)}
            {textField("areaSqm", messages.admin.area, {
              type: "number",
              min: "0",
            })}
            {textField("bedrooms", messages.admin.bedrooms, {
              type: "number",
              min: "0",
            })}
            {textField("bathrooms", messages.admin.bathrooms, {
              type: "number",
              min: "0",
            })}
            {textField("floor", messages.admin.floor, { type: "number" })}
            {textField("latitude", messages.admin.latitude, {
              type: "number",
              min: "-90",
              max: "90",
            })}
            {textField("longitude", messages.admin.longitude, {
              type: "number",
              min: "-180",
              max: "180",
            })}
            <label className="admin-field admin-field-full">
              <span>{messages.admin.features}</span>
              <textarea
                value={fields.features}
                rows={4}
                onChange={(event) => setField("features", event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="admin-form-section">
          <h2>{messages.admin.media}</h2>
          {listing ? (
            <AdminMediaManager
              listingId={listing.id}
              media={listing.media}
              locale={locale}
              onChange={(media) =>
                setListing((current) => current && { ...current, media })
              }
            />
          ) : (
            <p className="admin-muted">{messages.admin.mediaCreateFirst}</p>
          )}
        </section>

        <div className="admin-form-actions">
          <button
            className="button button-primary"
            type="submit"
            disabled={saving}
          >
            {saving ? messages.admin.saving : messages.admin.save}
          </button>
          <Link
            href={`/${locale}/admin/listings`}
            className="button button-outline"
          >
            {messages.admin.cancel}
          </Link>
        </div>
      </form>
    </div>
  );
}
