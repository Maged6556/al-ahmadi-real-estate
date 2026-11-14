"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@al-ahmadi/shared";
import { getMessages } from "../lib/i18n";

const CONSENT_COOKIE = "cookie_consent";
const CONSENT_TTL_SECONDS = 60 * 60 * 24 * 365;

export type CookieConsentState = {
  analytics: boolean;
  marketing: boolean;
  expiresAt: number;
};

export function parseConsentCookie(
  value: string | undefined,
  now = Date.now(),
): CookieConsentState | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(value));
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("analytics" in parsed) ||
      !("marketing" in parsed) ||
      !("expiresAt" in parsed) ||
      typeof parsed.analytics !== "boolean" ||
      typeof parsed.marketing !== "boolean" ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt <= now
    ) {
      return null;
    }

    return {
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

function readConsentCookie() {
  const entry = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${CONSENT_COOKIE}=`));
  return parseConsentCookie(entry?.slice(CONSENT_COOKIE.length + 1));
}

export function CookieConsent({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setVisible(!readConsentCookie());
    const reopen = () => {
      setSaved(false);
      setVisible(true);
    };
    window.addEventListener("cookie-consent:open", reopen);
    return () => window.removeEventListener("cookie-consent:open", reopen);
  }, []);

  function saveConsent(choice: "all" | "none" | "custom") {
    const expiresAt = Date.now() + CONSENT_TTL_SECONDS * 1000;
    const consent = {
      analytics: choice === "all" || (choice === "custom" && analytics),
      marketing: choice === "all" || (choice === "custom" && marketing),
      expiresAt,
    };
    const secure = window.location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(consent))}; path=/; max-age=${CONSENT_TTL_SECONDS}; samesite=lax${secure}`;
    window.dispatchEvent(
      new CustomEvent("cookie-consent:updated", { detail: consent }),
    );
    setVisible(false);
    setCustomizing(false);
    setSaved(true);
  }

  if (!visible) {
    return saved ? (
      <p className="consent-saved" role="status">
        {messages.cookies.saved}
      </p>
    ) : null;
  }

  return (
    <section
      className="cookie-consent"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
    >
      <div className="cookie-consent-copy">
        <h2 id="cookie-consent-title">{messages.cookies.title}</h2>
        <p>{messages.cookies.description}</p>
      </div>
      {customizing && (
        <div className="cookie-consent-options">
          <label>
            <input type="checkbox" checked disabled />
            <span>{locale === "ar" ? "ضرورية دائماً" : "Always essential"}</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={analytics}
              onChange={(event) => setAnalytics(event.target.checked)}
            />
            <span>{messages.cookies.analytics}</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={marketing}
              onChange={(event) => setMarketing(event.target.checked)}
            />
            <span>{messages.cookies.marketing}</span>
          </label>
        </div>
      )}
      <div className="cookie-consent-actions">
        <button
          className="button button-primary"
          onClick={() => saveConsent(customizing ? "custom" : "all")}
        >
          {customizing ? messages.cookies.save : messages.cookies.accept}
        </button>
        {!customizing && (
          <button
            className="button button-secondary"
            onClick={() => saveConsent("none")}
          >
            {messages.cookies.reject}
          </button>
        )}
        <button
          className="button button-quiet"
          onClick={() => setCustomizing(!customizing)}
        >
          {customizing ? messages.cookies.cancel : messages.cookies.customize}
        </button>
      </div>
    </section>
  );
}
