"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Locale } from "@al-ahmadi/shared";
import { getMessages } from "../lib/i18n";

type AccountUser = {
  id: string;
  email: string;
  name: string | null;
  preferredLocale: Locale;
  emailVerifiedAt: string | null;
};

function apiUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  return `${base.replace(/\/+$/, "")}${path}`;
}

export function AccountCenter({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  const copy = messages.account;
  const [user, setUser] = useState<AccountUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(apiUrl("/api/account"), { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("account_load_failed");
        const body = (await response.json()) as { data: { user: AccountUser } };
        if (active) setUser(body.data.user);
      })
      .catch(() => {
        if (active) setFeedback(copy.loadError);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [copy.loadError]);

  async function submit(
    event: FormEvent<HTMLFormElement>,
    path: string,
    method: "PATCH" | "POST" | "DELETE",
    successMessage: string,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = Object.fromEntries(data.entries());
    setFeedback(null);
    if (method === "DELETE" && !window.confirm(copy.deleteWarning)) return;
    try {
      const response = await fetch(apiUrl(`/api/account${path}`), {
        method,
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-requested-with": "XMLHttpRequest",
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        setFeedback(copy.error);
        return;
      }
      if (path === "/password") {
        setFeedback(copy.passwordChanged);
        window.location.assign(`/${locale}/login`);
        return;
      }
      if (path === "" && method === "PATCH") {
        const result = (await response.json()) as {
          data: { user: AccountUser };
        };
        setUser(result.data.user);
      }
      if (method === "DELETE") {
        setFeedback(copy.deleted);
        window.location.assign(`/${locale}`);
        return;
      }
      setFeedback(successMessage);
      form.reset();
    } catch {
      setFeedback(copy.error);
    }
  }

  async function resendVerification() {
    setFeedback(null);
    try {
      const response = await fetch(apiUrl("/api/auth/resend-verification"), {
        method: "POST",
        credentials: "include",
        headers: { "x-requested-with": "XMLHttpRequest" },
      });
      setFeedback(response.ok ? messages.lifecycle.genericSuccess : copy.error);
    } catch {
      setFeedback(copy.error);
    }
  }

  if (!loaded) {
    return <p className="account-status">{copy.loading}</p>;
  }
  if (!user) {
    return (
      <div className="account-status">
        <p>{feedback ?? copy.loadError}</p>
        <Link className="button button-primary" href={`/${locale}/login`}>
          {messages.nav.login}
        </Link>
      </div>
    );
  }

  return (
    <div className="account-center">
      {feedback && (
        <p className="form-feedback form-success" role="status">
          {feedback}
        </p>
      )}
      <section className="account-section">
        <h2>{copy.title}</h2>
        <p>
          {copy.email}: {user.email} ·{" "}
          {user.emailVerifiedAt ? copy.verified : copy.unverified}
        </p>
        {!user.emailVerifiedAt && (
          <button
            className="button button-secondary"
            onClick={resendVerification}
          >
            {copy.resendVerification}
          </button>
        )}
        <form
          className="account-form"
          onSubmit={(event) => submit(event, "", "PATCH", copy.profileSaved)}
        >
          <label>
            <span>{copy.name}</span>
            <input name="name" defaultValue={user.name ?? ""} maxLength={120} />
          </label>
          <label>
            <span>{copy.language}</span>
            <select name="preferredLocale" defaultValue={user.preferredLocale}>
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </label>
          <button className="button button-primary">{copy.saveProfile}</button>
        </form>
      </section>

      <section className="account-section">
        <h2>{copy.requestEmailChange}</h2>
        <form
          className="account-form"
          onSubmit={(event) =>
            submit(event, "/email", "POST", copy.emailChangeSent)
          }
        >
          <label>
            <span>{copy.newEmail}</span>
            <input name="email" type="email" maxLength={320} required />
          </label>
          <button className="button button-secondary">
            {copy.requestEmailChange}
          </button>
        </form>
      </section>

      <section className="account-section">
        <h2>{copy.changePassword}</h2>
        <form
          className="account-form"
          onSubmit={(event) =>
            submit(event, "/password", "POST", copy.passwordChanged)
          }
        >
          <label>
            <span>{copy.currentPassword}</span>
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            <span>{copy.newPassword}</span>
            <input
              name="newPassword"
              type="password"
              minLength={10}
              maxLength={72}
              autoComplete="new-password"
              required
            />
          </label>
          <button className="button button-secondary">
            {copy.changePassword}
          </button>
        </form>
      </section>

      <section className="account-section account-danger">
        <h2>{copy.deleteTitle}</h2>
        <p>{copy.deleteWarning}</p>
        <form
          className="account-form"
          onSubmit={(event) => submit(event, "", "DELETE", copy.deleted)}
        >
          <label>
            <span>{copy.currentPassword}</span>
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button className="button button-danger">{copy.deleteAccount}</button>
        </form>
      </section>
    </div>
  );
}
