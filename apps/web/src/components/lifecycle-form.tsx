"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Locale } from "@al-ahmadi/shared";
import { getMessages } from "../lib/i18n";

type LifecycleMode = "verify" | "forgot" | "reset";

export function LifecycleForm({
  locale,
  mode,
  token,
}: {
  locale: Locale;
  mode: LifecycleMode;
  token?: string;
}) {
  const messages = getMessages(locale);
  const copy = messages.lifecycle;
  const [actionToken, setActionToken] = useState(token ?? "");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    success: boolean;
  } | null>(null);

  useEffect(() => {
    if (token) {
      setActionToken(token);
      return;
    }
    if (mode === "forgot") return;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const fragmentToken = fragment.get("token") ?? "";
    setActionToken(fragmentToken);
    if (fragmentToken) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
  }, [mode, token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const apiBase =
      process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
    const path =
      mode === "verify"
        ? "verify-email"
        : mode === "forgot"
          ? "forgot-password"
          : "reset-password";
    const body =
      mode === "verify"
        ? { token: actionToken }
        : mode === "forgot"
          ? { email: formData.get("email") }
          : { token: actionToken, password: formData.get("password") };

    setPending(true);
    setFeedback(null);
    try {
      const response = await fetch(
        `${apiBase.replace(/\/+$/, "")}/api/auth/${path}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-requested-with": "XMLHttpRequest",
          },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        setFeedback({ message: copy.error, success: false });
        return;
      }
      setFeedback({
        message: mode === "forgot" ? copy.genericSuccess : copy.success,
        success: true,
      });
      form.reset();
    } catch {
      setFeedback({ message: copy.error, success: false });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form lifecycle-form" onSubmit={submit}>
      {mode === "forgot" && (
        <label>
          <span>{copy.email}</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            maxLength={320}
            required
          />
        </label>
      )}
      {mode === "reset" && (
        <label>
          <span>{copy.password}</span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={10}
            maxLength={72}
            required
          />
        </label>
      )}
      <button
        className="button button-primary auth-submit"
        disabled={pending || (mode !== "forgot" && !actionToken)}
      >
        {pending
          ? "…"
          : mode === "verify"
            ? copy.verifyAction
            : mode === "forgot"
              ? copy.forgotAction
              : copy.resetAction}
      </button>
      {!actionToken && mode !== "forgot" && (
        <p className="form-feedback form-error" role="status">
          {copy.error}
        </p>
      )}
      {feedback && (
        <p
          className={`form-feedback ${feedback.success ? "form-success" : "form-error"}`}
          role="status"
        >
          {feedback.message}
        </p>
      )}
      <p className="auth-switch">
        <Link href={`/${locale}/login`}>{messages.nav.login}</Link>
      </p>
    </form>
  );
}
