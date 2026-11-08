"use client";

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "EDITOR" | "USER";
  preferredLocale: string;
  emailVerifiedAt: string | null;
};

export type AdminMedia = {
  id: string;
  kind: "image" | "video" | "IMAGE" | "VIDEO";
  url: string;
  width: number | null;
  height: number | null;
  sortOrder: number;
  isCover: boolean;
  altAr: string | null;
  altEn: string | null;
};

export type AdminListing = {
  id: string;
  code: string;
  slug: string;
  type: "apartment" | "building" | "residential_unit" | "villa" | "land";
  offer: "sale" | "rent";
  status: "available" | "sold" | "rented";
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  city: string;
  district: string | null;
  addressText: string | null;
  latitude: number | null;
  longitude: number | null;
  areaSqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  features: string[];
  isPublished: boolean;
  publishedAt: string | null;
  soldAt: string | null;
  rentedAt: string | null;
  createdAt: string;
  updatedAt: string;
  media: AdminMedia[];
};

export type AdminListingInput = Omit<
  AdminListing,
  | "id"
  | "status"
  | "isPublished"
  | "publishedAt"
  | "soldAt"
  | "rentedAt"
  | "createdAt"
  | "updatedAt"
  | "media"
> & {
  features: string[];
};

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export async function adminRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (init.method && init.method !== "GET") {
    headers.set("x-requested-with", "XMLHttpRequest");
  }

  const url = `${apiBase.replace(/\/+$/, "")}${path}`;
  const sendRequest = () =>
    fetch(url, {
      ...init,
      headers,
      credentials: "include",
      cache: "no-store",
    });

  let response = await sendRequest();
  if (response.status === 401 && path !== "/api/auth/refresh") {
    const refreshed = await fetch(
      `${apiBase.replace(/\/+$/, "")}/api/auth/refresh`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-requested-with": "XMLHttpRequest",
        },
        body: "{}",
        credentials: "include",
        cache: "no-store",
      },
    );
    if (refreshed.ok) response = await sendRequest();
  }
  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const body = (await response.json()) as {
        error?: { message?: string };
      };
      message = body.error?.message ?? message;
    } catch {
      // The server may return an empty response for network or proxy errors.
    }
    throw new AdminApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function adminApiUrl(path: string) {
  return `${apiBase.replace(/\/+$/, "")}${path}`;
}
