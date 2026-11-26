"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import type { Locale } from "@al-ahmadi/shared";
import { LEGAL_PRIVACY_VERSION, LEGAL_TERMS_VERSION } from "@al-ahmadi/shared";
import { getMessages } from "../lib/i18n";

type FieldErrors = {
  email?: string;
  password?: string;
  name?: string;
  terms?: string;
  form?: string;
};

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

function getSafeAdminPath(path: string | null, locale: Locale): string | null {
  if (!path) return null;

  const prefix = `/${locale}/admin`;
  try {
    const parsed = new URL(path, window.location.origin);
    const isAdminPath =
      parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`);

    if (
      parsed.origin !== window.location.origin ||
      parsed.username ||
      parsed.password ||
      !isAdminPath
    ) {
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function validateEmail(email: string): string | null {
  if (!email) return "required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "invalid";
  return null;
}

function validatePassword(
  password: string,
  minLength: number,
): string | null {
  if (!password) return "required";
  if (password.length < minLength) return "tooShort";
  if (Buffer.byteLength(password, "utf8") > 72) return "tooLong";
  return null;
}

export function AuthForm({
  locale,
  mode,
  registered,
}: {
  locale: Locale;
  mode: "login" | "register";
  registered?: boolean;
}) {
  const messages = getMessages(locale);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<{
    message: string;
    success: boolean;
  } | null>(null);

  const emailError = fieldErrors.email;
  const passwordError = fieldErrors.password;
  const nameError = fieldErrors.name;
  const termsError = fieldErrors.terms;
  const formError = fieldErrors.form;

  function fieldMessage(key: string | undefined): string | null {
    if (!key) return null;
    switch (key) {
      case "required":
        return messages.auth.fieldRequired;
      case "invalid":
        return messages.auth.emailInvalid;
      case "tooShort":
        return messages.auth.passwordTooShort;
      case "tooLong":
        return messages.auth.passwordTooLong;
      default:
        return null;
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const name = String(data.get("name") ?? "").trim();
    const termsAccepted = data.get("termsAccepted") === "on";
    const apiBase =
      process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
    const minLength = mode === "register" ? 10 : 1;

    const nextErrors: FieldErrors = {};
    const emailErr = validateEmail(email);
    if (emailErr) nextErrors.email = emailErr;
    const passwordErr = validatePassword(password, minLength);
    if (passwordErr) nextErrors.password = passwordErr;
    if (mode === "register" && !name) nextErrors.name = "required";
    if (mode === "register" && !termsAccepted) nextErrors.terms = "required";

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFeedback(null);
      return;
    }

    setPending(true);
    setFeedback(null);
    setFieldErrors({});

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
            email,
            password,
            ...(mode === "register"
              ? {
                  name: name || undefined,
                  preferredLocale: locale,
                  termsAccepted,
                }
              : {}),
          }),
        },
      );

      if (response.status === 409) {
        setFieldErrors({ form: "emailExists" });
        setPending(false);
        return;
      }

      if (response.status === 401) {
        setFieldErrors({ form: "invalidCredentials" });
        setPending(false);
        return;
      }

      if (!response.ok) {
        setFieldErrors({ form: "serverError" });
        setPending(false);
        return;
      }

      const payload: unknown = await response.json();

      if (mode === "register") {
        setFeedback({
          message: messages.auth.registrationSuccess,
          success: true,
        });
        form.reset();
        router.replace(`/${locale}/login?registered=true`);
        return;
      }

      setFeedback({
        message: messages.auth.success,
        success: true,
      });
      if (mode === "login") {
        const next = new URLSearchParams(window.location.search).get("next");
        const safeAdminPath = getSafeAdminPath(next, locale);
        if (isAdminLoginResponse(payload)) {
          router.replace(safeAdminPath ?? `/${locale}/admin`);
          return;
        }
        if (safeAdminPath) {
          router.replace(safeAdminPath);
          return;
        }
        router.replace(
          registered
            ? `/${locale}/account?forcePasswordChange=true`
            : `/${locale}/account`,
        );
        return;
      }
    } catch {
      setFieldErrors({ form: "networkError" });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      {registered && (
        <p className="form-feedback form-success" role="status">
          {messages.auth.registrationSuccess}
        </p>
      )}
      {formError && (
        <p className="form-feedback form-error" role="alert">
          {formMessage(formError)}
        </p>
      )}
      {mode === "register" && (
        <label>
          <span>{messages.auth.name}</span>
          {nameError && (
            <span className="field-error" aria-live="polite">
              {fieldMessage(nameError)}
            </span>
          )}
          <input
            name="name"
            type="text"
            autoComplete="name"
            maxLength={120}
            aria-invalid={nameError ? "true" : "false"}
            aria-describedby={nameError ? "name-error" : undefined}
          />
        </label>
      )}
      <label>
        <span>{messages.auth.email}</span>
        {emailError && (
          <span className="field-error" aria-live="polite">
            {fieldMessage(emailError)}
          </span>
        )}
        <input
          name="email"
          type="email"
          autoComplete="email"
          maxLength={320}
          required
          aria-invalid={emailError ? "true" : "false"}
          aria-describedby={emailError ? "email-error" : undefined}
        />
      </label>
      <label>
        <span>{messages.auth.password}</span>
        {passwordError && (
          <span className="field-error" aria-live="polite">
            {fieldMessage(passwordError)}
          </span>
        )}
        <input
          name="password"
          type="password"
          autoComplete={
            mode === "register" ? "new-password" : "current-password"
          }
          minLength={mode === "register" ? 10 : 1}
          maxLength={72}
          required
          aria-invalid={passwordError ? "true" : "false"}
          aria-describedby={passwordError ? "password-error" : undefined}
        />
      </label>
      {mode === "register" && (
        <label className="auth-consent">
          <input
            name="termsAccepted"
            type="checkbox"
            required
            aria-required="true"
          />
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
          {termsError && (
            <span className="field-error" aria-live="polite">
              {messages.auth.termsRequired}
            </span>
          )}
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

function formMessage(key: string): string | undefined {
  switch (key) {
    case "emailExists":
      return "This email is already registered. Try logging in instead.";
    case "invalidCredentials":
      return "Invalid email or password.";
    case "networkError":
      return "Unable to connect. Please check your internet and try again.";
    case "serverError":
      return "We could not complete your request. Please try again later.";
    default:
      return undefined;
  }
}
