"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@al-ahmadi/shared";
import { Icon } from "../components/ui/icon";
import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons";

interface ThemeToggleProps {
  locale: Locale;
  className?: string;
}

function getInitialTheme(): "light" | "dark" {
  if (typeof document !== "undefined") {
    const domTheme = document.documentElement.getAttribute("data-theme");
    if (domTheme === "dark" || domTheme === "light") {
      return domTheme;
    }
  }
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
}

export function ThemeToggle({ locale, className = "" }: ThemeToggleProps) {
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      const initial = prefersDark ? "dark" : "light";
      setTheme(initial);
      document.documentElement.setAttribute("data-theme", initial);
    }
  }, []);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === "theme" && event.newValue) {
        setTheme(event.newValue as "light" | "dark");
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    function onChange(event: MediaQueryListEvent) {
      const saved = localStorage.getItem("theme");
      if (!saved) {
        setTheme(event.matches ? "dark" : "light");
      }
    }
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    try {
      localStorage.setItem("theme", nextTheme);
    } catch {
      // Storage access may be restricted
    }
  }

  const isDark = theme === "dark";
  const title =
    locale === "ar"
      ? isDark
        ? "التبديل إلى الوضع الفاتح"
        : "التبديل إلى الوضع الداكن"
      : isDark
        ? "Switch to light mode"
        : "Switch to dark mode";

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={title}
      title={title}
      aria-pressed={isDark}
    >
      {mounted ? (
        isDark ? (
          <Icon
            icon={faSun}
            size="1x"
            className="theme-toggle-icon"
            aria-hidden="true"
          />
        ) : (
          <Icon
            icon={faMoon}
            size="1x"
            className="theme-toggle-icon"
            aria-hidden="true"
          />
        )
      ) : null}
    </button>
  );
}
