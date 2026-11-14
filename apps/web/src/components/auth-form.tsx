"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import type { Locale } from "@al-ahmadi/shared";
import { LEGAL_PRIVACY_VERSION, LEGAL_TERMS_VERSION } from "@al-ahmadi/shared";
import { getMessages } from "../lib/i18n";

function isAdminLoginResponse(
  payload: unknown,
): payload is { data: { user: { role: "ADMIN" } } } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "data" in payload &&
    typeof payload.data === "object" &&
    payload.data !== null &&
    "user" in payload.data &&
    typeof payload.data.user === "object" &&
    payload.data.user !== null &&
    "role" in payload.data.user &&
    payload.data.user.role === "ADMIN"
  );
}

function isAdminPath(path: string | null, locale: Locale): path is string {
  const prefix = `/${locale}/admin`;
  return Boolean(
    path?.startsWith(prefix) &&
    (path.length === prefix.length ||
      path[prefix.length] === "/" ||
      path[prefix.length] === "?" ||
      path[prefix.length] === "#"),
  );
}

export function AuthForm({
  locale,
  mode,
}: {
  locale: Locale;
  mode: "login" | "register";
}) {
  const messages = getMessages(locale);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    success: boolean;
  } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const apiBase =
      process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
    setPending(true);
    setFeedback(null);

    try {
      const response = await fetch(
        `${apiBase.replace(/\/+$/, "")}/api/auth/${mode}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
            "x-requested-with": "XMLHttpRequest",
          },
          body: JSON.stringify({
            email: data.get("email"),
            password: data.get("password"),
            ...(mode === "register"
              ? {
                  name: String(data.get("name") ?? "").trim() || undefined,
                  preferredLocale: locale,
                  termsAccepted: data.get("termsAccepted") === "on",
                }
              : {}),
          }),
        },
      );
      if (!response.ok) {
        setFeedback({ message: messages.auth.error, success: false });
        return;
      }
      const payload: unknown = await response.json();
      setFeedback({
        message:
          mode === "register"
            ? messages.auth.registrationSuccess
            : messages.auth.success,
        success: true,
      });
      form.reset();
      if (mode === "login") {
        const next = new URLSearchParams(window.location.search).get("next");
        if (isAdminLoginResponse(payload)) {
          window.location.assign(
            isAdminPath(next, locale) ? next : `/${locale}/admin`,
          );
          return;
        }
        if (isAdminPath(next, locale)) {
          window.location.assign(next);
          return;
        }
      }
    } catch {
      setFeedback({ message: messages.auth.error, success: false });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      {mode === "register" && (
        <label>
          <span>{messages.auth.name}</span>
          <input name="name" type="text" autoComplete="name" maxLength={120} />
        </label>
      )}
      <label>
        <span>{messages.auth.email}</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          maxLength={320}
          required
        />
      </label>
      <label>
        <span>{messages.auth.password}</span>
        <input
          name="password"
          type="password"
          autoComplete={
            mode === "register" ? "new-password" : "current-password"
          }
          minLength={mode === "register" ? 10 : 1}
          maxLength={72}
          required
        />
      </label>
      {mode === "register" && (
        <label className="auth-consent">
          <input name="termsAccepted" type="checkbox" required />
          <span>
            {messages.auth.termsLead}{" "}
            <Link href={`/${locale}/legal/terms`}>{messages.footer.terms}</Link>{" "}
            {messages.auth.and}{" "}
            <Link href={`/${locale}/legal/privacy`}>
              {messages.footer.privacy}
            </Link>
            .{" "}
            <small>
              {LEGAL_TERMS_VERSION}/{LEGAL_PRIVACY_VERSION}
            </small>
          </span>
        </label>
      )}
      <button className="button button-primary auth-submit" disabled={pending}>
        {pending
          ? "…"
          : mode === "register"
            ? messages.auth.registerSubmit
            : messages.auth.loginSubmit}
      </button>
      {feedback && (
        <p
          className={`form-feedback ${feedback.success ? "form-success" : "form-error"}`}
          role="status"
        >
          {feedback.message}
        </p>
      )}
      <p className="auth-switch">
        {mode === "register"
          ? messages.auth.registerPrompt
          : messages.auth.loginPrompt}{" "}
        <Link href={`/${locale}/${mode === "register" ? "login" : "register"}`}>
          {mode === "register"
            ? messages.auth.registerLink
            : messages.auth.loginLink}
        </Link>
      </p>
      {mode === "login" && (
        <p className="auth-switch">
          <Link href={`/${locale}/forgot-password`}>
            {messages.auth.forgotPassword}
          </Link>
        </p>
      )}
    </form>
  );
}
