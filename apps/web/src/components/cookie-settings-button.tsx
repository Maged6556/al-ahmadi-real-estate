"use client";

import type { Locale } from "@al-ahmadi/shared";
import { getMessages } from "../lib/i18n";

export function CookieSettingsButton({ locale }: { locale: Locale }) {
  const messages = getMessages(locale);
  return (
    <button
      className="footer-cookie-settings"
      onClick={() => window.dispatchEvent(new Event("cookie-consent:open"))}
    >
      {messages.footer.manageCookies}
    </button>
  );
}
