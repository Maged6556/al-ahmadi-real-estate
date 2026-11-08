import { notFound } from "next/navigation";
import type { Locale } from "@al-ahmadi/shared";
import { isLocale } from "./i18n";

export function requireLocale(value: string): Locale {
  if (!isLocale(value)) notFound();
  return value;
}
