"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { Locale } from "@al-ahmadi/shared";
import {
  adminRequest,
  type AdminListing,
  type AdminListingInput,
} from "../lib/admin-api";
import { getMessages } from "../lib/i18n";
import { AdminMediaManager } from "./admin-media-manager";
import {
  propertyTypeConfig,
  type PropertyTypeKey,
  TYPE_GATED_BASE_FIELDS,
  DETAIL_KEYS_BY_TYPE,
} from "../lib/property-type-config";

type FormFields = Omit<
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
  | "details"
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
  details: Record<string, string>;
};

function emptyFields(): FormFields {
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
    details: {},
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

function listingFields(listing: AdminListing): FormFields {
  const details: Record<string, string> = {};
  if (listing.details) {
    for (const [key, value] of Object.entries(listing.details)) {
      details[key] = Array.isArray(value) ? value.join(",") : String(value ?? "");
    }
  }
  return {
    code: listing.code,
    type: listing.type as PropertyTypeKey,
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
    details,
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
  const [fields, setFields] = useState<FormFields>(emptyFields);
  const [listing, setListing] = useState<AdminListing | null>(null);
  const [loading, setLoading] = useState(Boolean(listingId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const typeConfig = useMemo(
    () => propertyTypeConfig[fields.type],
    [fields.type],
  );

  const visibleBaseFields = useMemo(() => {
    const alwaysShown = new Set([
      "code",
      "type",
      "offer",
      "city",
      "district",
      "titleAr",
      "titleEn",
      "descriptionAr",
      "descriptionEn",
      "addressText",
      "latitude",
      "longitude",
      "features",
    ]);
    const gated = new Set(TYPE_GATED_BASE_FIELDS[fields.type]);
    return [
      "code",
      "type",
      "offer",
      "city",
      "district",
      "titleAr",
      "titleEn",
      "descriptionAr",
      "descriptionEn",
      "addressText",
      "latitude",
      "longitude",
      "areaSqm",
      "bedrooms",
      "bathrooms",
      "floor",
      "features",
    ].filter((key) => alwaysShown.has(key) || gated.has(key));
  }, [fields.type]);

  function setField<Key extends keyof FormFields>(key: Key, value: FormFields[Key]) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function setDetail(key: string, value: string) {
    setFields((current) => ({ ...current, details: { ...current.details, [key]: value } }));
  }

  function toggleCheckbox(key: string, value: string) {
    setFields((current) => {
      const currentValues = (current.details[key] ?? "").split(",").filter(Boolean);
      const next = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      return {
        ...current,
        details: { ...current.details, [key]: next.join(",") },
      };
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    setErrors({});

    const nextErrors: Record<string, string> = {};

    const validateField = (key: string, value: string, required: boolean) => {
      if (required && value.trim() === "") {
        nextErrors[key] = messages.admin.fieldRequired;
        return false;
      }
      return true;
    };

    const validateNumber = (key: string, value: string, min?: number) => {
      if (value.trim() === "") return true;
      const num = Number(value);
      if (!Number.isFinite(num)) {
        nextErrors[key] = messages.admin.invalidNumber;
        return false;
      }
      if (min !== null && min !== undefined && num < min) {
        nextErrors[key] = messages.admin.valueTooLow;
        return false;
      }
      return true;
    };

    // Base fields
    for (const key of visibleBaseFields) {
      const value = fields[key as keyof FormFields] as string;
      if (key === "areaSqm") {
        if (!validateNumber("areaSqm", value, 0)) continue;
      }
      if (key === "bedrooms") {
        if (!validateNumber("bedrooms", value, 0)) continue;
      }
      if (key === "bathrooms") {
        if (!validateNumber("bathrooms", value, 0)) continue;
      }
      if (key === "floor") {
        if (!validateNumber("floor", value)) continue;
      }
      if (key === "latitude") {
        if (!validateNumber("latitude", value)) continue;
      }
      if (key === "longitude") {
        if (!validateNumber("longitude", value)) continue;
      }
    }

    // Type-specific detail fields
    for (const field of typeConfig.fields) {
      const value = fields.details[field.key] ?? "";
      if (field.required && !validateField(field.key, value, true)) continue;
      if (field.inputType === "number" && !validateNumber(field.key, value, field.min)) continue;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSaving(false);
      return;
    }

    const visibleGated = new Set(TYPE_GATED_BASE_FIELDS[fields.type]);

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
      bedrooms: visibleGated.has("bedrooms")
        ? optionalNumber(fields.bedrooms)
        : null,
      bathrooms: visibleGated.has("bathrooms")
        ? optionalNumber(fields.bathrooms)
        : null,
      floor: visibleGated.has("floor")
        ? optionalNumber(fields.floor)
        : null,
      features: fields.features
        .split("\n")
        .map((feature) => feature.trim())
        .filter(Boolean),
      details: serializeDetails(fields.type, fields.details),
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

  function serializeDetails(
    type: PropertyTypeKey,
    details: Record<string, string>,
  ): Record<string, unknown> {
    const allowed = new Set(DETAIL_KEYS_BY_TYPE[type]);
    const serialized: Record<string, unknown> = {};
    for (const field of typeConfig.fields) {
      if (!allowed.has(field.key)) continue;
      const raw = details[field.key];
      if (raw === undefined || raw.trim() === "") continue;
      if (field.inputType === "number") {
        serialized[field.key] = Number(raw);
      } else if (field.inputType === "checkbox") {
        serialized[field.key] = raw.split(",").filter(Boolean);
      } else {
        serialized[field.key] = raw;
      }
    }
    return serialized;
  }

  const textField = (
    key: keyof FormFields,
    label: string,
    options: {
      required?: boolean;
      type?: string;
      min?: string;
      max?: string;
    } = {},
  ) => {
    const fieldError = errors[key as string];
    return (
      <label className="admin-field" key={key}>
        <span>{label}</span>
        <input
          name={key}
          type={options.type ?? "text"}
          value={fields[key] as string}
          required={options.required}
          min={options.min}
          max={options.max}
          aria-invalid={fieldError ? true : undefined}
          onChange={(event) => setField(key, event.target.value)}
        />
        {fieldError && <span className="field-error">{fieldError}</span>}
      </label>
    );
  };

  const detailField = (field: PropertyTypeFieldT) => {
    const value = fields.details[field.key] ?? "";
    const fieldError = errors[field.key];
    const isCheckbox = field.inputType === "checkbox";
    const isSelect = field.inputType === "select";
    const isNumber = field.inputType === "number";
    return (
      <label className="admin-field" key={field.key}>
        <span>
          {field.label.ar}
          {field.label.en !== field.label.ar && ` (${field.label.en})`}
        </span>
        {isCheckbox ? (
          <>
            {field.options?.map((option) => {
              const checked = value.split(",").includes(option.value);
              return (
                <span
                  key={option.value}
                  className="admin-checkbox"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCheckbox(field.key, option.value)}
                    aria-invalid={fieldError ? true : undefined}
                  />
                  {option.label.ar}
                </span>
              );
            })}
          </>
        ) : isSelect ? (
          <select
            value={value}
            onChange={(event) => setDetail(field.key, event.target.value)}
            aria-invalid={fieldError ? true : undefined}
          >
            <option value="">{messages.common.choose}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label.ar}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={isNumber ? "number" : "text"}
            value={value}
            min={isNumber ? String(field.min ?? "") : undefined}
            onChange={(event) => setDetail(field.key, event.target.value)}
            aria-invalid={fieldError ? true : undefined}
          />
        )}
        {field.unit && <span className="field-unit">{field.unit}</span>}
        {fieldError && <span className="field-error">{fieldError}</span>}
      </label>
    );
  };

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
        <div className="inline-error" role="alert">{error}</div>
      )}
      {success && (
        <p className="form-feedback form-success" role="status">{success}</p>
      )}

      <form className="admin-editor-form" onSubmit={submit}>
        <section className="admin-form-section">
          <h2>{messages.admin.listingDetails}</h2>
          <div className="admin-form-grid">
            {visibleBaseFields.map((key) => {
              if (key === "type") {
                return (
                  <label className="admin-field" key="type">
                    <span>{messages.admin.type}</span>
                    <select
                      value={fields.type}
                      onChange={(event) => {
                        const next = event.target.value as PropertyTypeKey;
                        const nextGated = new Set(
                          TYPE_GATED_BASE_FIELDS[next] ?? [],
                        );
                        const allowed = new Set(
                          DETAIL_KEYS_BY_TYPE[next] ?? [],
                        );
                        setField("type", next);
                        setFields((current) => ({
                          ...current,
                          bedrooms: nextGated.has("bedrooms")
                            ? current.bedrooms
                            : "",
                          bathrooms: nextGated.has("bathrooms")
                            ? current.bathrooms
                            : "",
                          floor: nextGated.has("floor")
                            ? current.floor
                            : "",
                          details: Object.fromEntries(
                            Object.entries(current.details).filter(([k]) =>
                              allowed.has(k),
                            ),
                          ),
                        }));
                      }}
                    >
                      {([
                        "apartment",
                        "building",
                        "residential_unit",
                        "villa",
                        "land",
                      ] as const).map((type) => (
                        <option key={type} value={type}>
                          {messages.admin[type]}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              }
              switch (key) {
                case "code":
                  return textField("code", messages.admin.code, {
                    required: true,
                  });
                case "city":
                  return textField("city", messages.admin.city, {
                    required: true,
                  });
                case "district":
                  return textField("district", messages.admin.district);
                case "titleAr":
                  return textField("titleAr", messages.admin.titleAr, {
                    required: true,
                  });
                case "titleEn":
                  return textField("titleEn", messages.admin.titleEn, {
                    required: true,
                  });
                case "descriptionAr":
                  return (
                    <label className="admin-field admin-field-full" key="descriptionAr">
                      <span>{messages.admin.descriptionAr}</span>
                      <textarea
                        value={fields.descriptionAr}
                        required
                        maxLength={10000}
                        rows={5}
                        onChange={(event) =>
                          setField("descriptionAr", event.target.value)
                        }
                        aria-invalid={errors.descriptionAr ? true : undefined}
                      />
                      {errors.descriptionAr && (
                        <span className="field-error">{errors.descriptionAr}</span>
                      )}
                    </label>
                  );
                case "descriptionEn":
                  return (
                    <label className="admin-field admin-field-full" key="descriptionEn">
                      <span>{messages.admin.descriptionEn}</span>
                      <textarea
                        value={fields.descriptionEn}
                        required
                        maxLength={10000}
                        rows={5}
                        onChange={(event) =>
                          setField("descriptionEn", event.target.value)
                        }
                        aria-invalid={errors.descriptionEn ? true : undefined}
                      />
                      {errors.descriptionEn && (
                        <span className="field-error">{errors.descriptionEn}</span>
                      )}
                    </label>
                  );
                case "addressText":
                  return textField("addressText", messages.admin.address);
                case "areaSqm":
                  return textField("areaSqm", messages.admin.area, {
                    type: "number",
                    min: "0",
                  });
                case "bedrooms":
                  return textField("bedrooms", messages.admin.bedrooms, {
                    type: "number",
                    min: "0",
                  });
                case "bathrooms":
                  return textField("bathrooms", messages.admin.bathrooms, {
                    type: "number",
                    min: "0",
                  });
                case "floor":
                  return textField("floor", messages.admin.floor, {
                    type: "number",
                  });
                case "latitude":
                  return textField("latitude", messages.admin.latitude, {
                    type: "number",
                    min: "-90",
                    max: "90",
                  });
                case "longitude":
                  return textField("longitude", messages.admin.longitude, {
                    type: "number",
                    min: "-180",
                    max: "180",
                  });
                case "features":
                  return (
                    <label className="admin-field admin-field-full" key="features">
                      <span>{messages.admin.features}</span>
                      <textarea
                        value={fields.features}
                        rows={4}
                        onChange={(event) => setField("features", event.target.value)}
                      />
                    </label>
                  );
                default:
                  return null;
              }
            })}
            {typeConfig.fields.map((field) => detailField(field as PropertyTypeFieldT))}
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

interface PropertyTypeFieldT {
  key: string;
  label: { ar: string; en: string };
  inputType: "number" | "select" | "checkbox";
  unit?: string;
  required?: boolean;
  min?: number;
  max?: number;
  options?: { value: string; label: { ar: string; en: string } }[];
}
