"use client";

import Image from "next/image";
import { useState } from "react";
import type { FormEvent } from "react";
import type { AdminMedia } from "../lib/admin-api";
import { adminApiUrl, adminRequest } from "../lib/admin-api";
import { getMessages } from "../lib/i18n";
import type { Locale } from "@al-ahmadi/shared";
import { useAdminUser } from "./admin-gate";

type Props = {
  listingId: string;
  media: AdminMedia[];
  locale: Locale;
  onChange: (media: AdminMedia[]) => void;
};

function uploadFileWithProgress(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (progress: number) => void,
): Promise<{ data: AdminMedia }> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", url);
    request.withCredentials = true;
    request.timeout = 120_000;
    for (const [name, value] of Object.entries(headers)) {
      request.setRequestHeader(name, value);
    }
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error("Upload request failed."));
        return;
      }
      try {
        resolve(JSON.parse(request.responseText) as { data: AdminMedia });
      } catch {
        reject(new Error("Upload response was invalid."));
      }
    };
    request.onerror = () => reject(new Error("Upload request failed."));
    request.ontimeout = () => reject(new Error("Upload request timed out."));
    request.send(file);
  });
}

export function AdminMediaManager({
  listingId,
  media,
  locale,
  onChange,
}: Props) {
  const messages = getMessages(locale);
  const user = useAdminUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [videoUrl, setVideoUrl] = useState("");

  if (user?.role !== "ADMIN") {
    return (
      <p className="admin-muted" role="note">
        {messages.admin.editorMediaNote}
      </p>
    );
  }

  async function uploadFiles(files: FileList | File[]) {
    const selected = Array.from(files);
    if (selected.length === 0) return;
    setBusy(true);
    setError("");

    try {
      let updated = [...media];
      for (const file of selected) {
        const contentType = file.type.toLowerCase();
        if (
          contentType !== "image/jpeg" &&
          contentType !== "image/png" &&
          contentType !== "image/webp"
        ) {
          throw new Error(messages.admin.uploadError);
        }

        const grantResponse = await adminRequest<{
          data: {
            uploadUrl: string;
            uploadToken: string;
            contentType: string;
            expectedContentType: string;
            maxBytes: number;
          };
        }>("/api/admin/media/sign", {
          method: "POST",
          body: JSON.stringify({ listingId, contentType }),
        });
        if (file.size > grantResponse.data.maxBytes) {
          throw new Error(messages.admin.uploadError);
        }

        const payload = await uploadFileWithProgress(
          adminApiUrl(grantResponse.data.uploadUrl),
          file,
          {
            "content-type": grantResponse.data.contentType,
            "x-upload-token": grantResponse.data.uploadToken,
            "x-upload-content-type": grantResponse.data.expectedContentType,
            "x-requested-with": "XMLHttpRequest",
          },
          setUploadProgress,
        );
        const hasCoverImage = updated.some(
          (existing) =>
            existing.kind.toLowerCase() === "image" && existing.isCover,
        );
        const item = {
          ...payload.data,
          kind: "image" as const,
          sortOrder: updated.length,
          isCover: !hasCoverImage,
          altAr: payload.data.altAr ?? null,
          altEn: payload.data.altEn ?? null,
        };
        updated = [...updated, item];
        onChange(updated);
      }
      onChange(updated);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : messages.admin.uploadError,
      );
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  }

  async function addVideoLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await adminRequest<{ data: AdminMedia }>(
        "/api/admin/media/video-link",
        {
          method: "POST",
          body: JSON.stringify({ listingId, url: videoUrl }),
        },
      );
      onChange([
        ...media,
        {
          ...response.data,
          kind: "video",
          sortOrder: media.length,
          isCover: false,
        },
      ]);
      setVideoUrl("");
    } catch {
      setError(messages.admin.videoLinkError);
    } finally {
      setBusy(false);
    }
  }

  async function saveOrder(items: AdminMedia[]): Promise<boolean> {
    if (items.length === 0) {
      onChange([]);
      return true;
    }
    const normalized = items.map((item, index) => ({
      ...item,
      sortOrder: index,
      isCover: item.isCover,
    }));
    const firstImageIndex = normalized.findIndex(
      (item) => item.kind.toLowerCase() === "image",
    );
    if (firstImageIndex >= 0 && !normalized.some((item) => item.isCover)) {
      normalized[firstImageIndex] = {
        ...normalized[firstImageIndex],
        isCover: true,
      };
    }
    if (firstImageIndex < 0) {
      for (const [index, item] of normalized.entries()) {
        normalized[index] = { ...item, isCover: false };
      }
    }
    try {
      await adminRequest("/api/admin/media/reorder", {
        method: "PATCH",
        body: JSON.stringify({
          listingId,
          media: normalized.map(({ id, sortOrder, isCover }) => ({
            id,
            sortOrder,
            isCover,
          })),
        }),
      });
      onChange(normalized);
      return true;
    } catch {
      setError(messages.admin.actionError);
      return false;
    }
  }

  function moveItem(itemId: string, targetId: string) {
    if (itemId === targetId) return;
    const items = [...media];
    const from = items.findIndex(({ id }) => id === itemId);
    const to = items.findIndex(({ id }) => id === targetId);
    if (from < 0 || to < 0) return;
    const [item] = items.splice(from, 1);
    items.splice(to, 0, item);
    void saveOrder(items);
  }

  async function setCover(itemId: string) {
    await saveOrder(
      media.map((item) => ({ ...item, isCover: item.id === itemId })),
    );
  }

  async function removeItem(item: AdminMedia) {
    setBusy(true);
    setError("");
    try {
      await adminRequest(`/api/admin/media/${item.id}`, {
        method: "DELETE",
        body: "{}",
      });
      const remaining = media.filter(({ id }) => id !== item.id);
      const nextCoverIndex = remaining.findIndex(
        (entry) => entry.kind.toLowerCase() === "image",
      );
      const orderedRemaining = remaining.map((entry, index) => ({
        ...entry,
        sortOrder: index,
        isCover: item.isCover
          ? index === nextCoverIndex
          : entry.kind.toLowerCase() === "image" && entry.isCover,
      }));
      onChange(orderedRemaining);
      if (orderedRemaining.length > 0) await saveOrder(orderedRemaining);
      else onChange([]);
    } catch {
      setError(messages.admin.actionError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="admin-media-manager"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDrop={(event) => {
        if (event.dataTransfer.files.length > 0) {
          event.preventDefault();
          void uploadFiles(event.dataTransfer.files);
        }
      }}
    >
      <p className="admin-muted">{messages.admin.mediaHelp}</p>
      <label className="button button-outline admin-upload-button">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy || media.length >= 20}
          onChange={(event) => {
            if (event.currentTarget.files)
              void uploadFiles(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
        {busy ? messages.admin.uploading : messages.admin.upload}
      </label>
      {media.length >= 20 && (
        <p className="admin-muted">{messages.admin.mediaLimit}</p>
      )}
      {uploadProgress !== null && (
        <div className="admin-upload-progress" role="status">
          <progress
            value={uploadProgress}
            max={100}
            aria-label={messages.admin.uploading}
          />
          <span>{uploadProgress}%</span>
        </div>
      )}
      <form className="admin-video-link-form" onSubmit={addVideoLink}>
        <label>
          <span>{messages.admin.videoLink}</span>
          <input
            type="url"
            value={videoUrl}
            required
            placeholder="https://example.com/property-tour.mp4"
            onChange={(event) => setVideoUrl(event.target.value)}
          />
        </label>
        <button
          type="submit"
          className="button button-outline"
          disabled={busy || media.length >= 20}
        >
          {messages.admin.addVideo}
        </button>
      </form>
      {error && (
        <p className="form-feedback form-error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-media-grid">
        {media.map((item, index) => (
          <article
            className={`admin-media-item ${item.isCover ? "is-cover" : ""}`}
            key={item.id}
            draggable
            onDragStart={() => setDraggedId(item.id)}
            onDragEnd={() => setDraggedId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (draggedId) moveItem(draggedId, item.id);
              setDraggedId(null);
            }}
          >
            {item.kind.toLowerCase() === "video" ? (
              <a
                className="admin-video-preview"
                href={item.url}
                target="_blank"
                rel="noreferrer"
              >
                <span aria-hidden="true">▶</span>
                {messages.admin.video}
              </a>
            ) : (
              <Image
                src={item.url}
                alt={locale === "ar" ? (item.altAr ?? "") : (item.altEn ?? "")}
                width={item.width ?? 800}
                height={item.height ?? 600}
                unoptimized
              />
            )}
            {item.isCover && (
              <span className="admin-cover-badge">{messages.admin.cover}</span>
            )}
            <span className="admin-media-index">{index + 1}</span>
            <div className="admin-media-actions">
              {!item.isCover && item.kind.toLowerCase() === "image" && (
                <button
                  type="button"
                  className="table-action"
                  disabled={busy}
                  onClick={() => void setCover(item.id)}
                >
                  {messages.admin.makeCover}
                </button>
              )}
              <button
                type="button"
                className="table-action"
                disabled={busy || index === 0}
                aria-label={messages.admin.moveLeft}
                onClick={() => moveItem(item.id, media[index - 1].id)}
              >
                ↑
              </button>
              <button
                type="button"
                className="table-action"
                disabled={busy || index === media.length - 1}
                aria-label={messages.admin.moveRight}
                onClick={() => moveItem(item.id, media[index + 1].id)}
              >
                ↓
              </button>
              <button
                type="button"
                className="table-action table-action-danger"
                disabled={busy}
                aria-label={messages.admin.removeImage}
                onClick={() => void removeItem(item)}
              >
                ×
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
