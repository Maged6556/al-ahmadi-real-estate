import ar from "../messages/ar.json";
import en from "../messages/en.json";
import type { Locale } from "@al-ahmadi/shared";

export const messages = { ar, en } as const;
export type Messages = (typeof messages)[Locale];

export function isLocale(value: string): value is Locale {
  return value === "ar" || value === "en";
}

export function getMessages(locale: Locale): Messages {
  return messages[locale];
}

export function localizedPath(locale: Locale, pathname: string) {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const segments = path.split("/");
  if (isLocale(segments[1] ?? "")) segments[1] = locale;
  else segments.splice(1, 0, locale);
  return segments.join("/") || `/${locale}`;
}
