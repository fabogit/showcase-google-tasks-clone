import { useCallback, useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "themePreference";

export type ThemePreference = "light" | "dark" | "system";

export type AppliedTheme = "light" | "dark";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function getSystemTheme(): AppliedTheme {
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

function readStoredThemePreference(): ThemePreference {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(storedTheme) ? storedTheme : "system";
  } catch {
    return "system";
  }
}

function writeStoredThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Ignore storage write errors in restricted browsing contexts.
  }
}

/**
 * Manages the application's tri-state theme (`light` | `dark` | `system`),
 * safely persisting preferences and syncing across OS changes and browser tabs.
 */
export const useTheme = (): [ThemePreference, (theme: ThemePreference) => void] => {
  const [themePreference, setThemePreference] =
    useState<ThemePreference>(readStoredThemePreference);

  const applyTheme = useCallback((theme: AppliedTheme) => {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    root.style.setProperty("color-scheme", theme);
  }, []);

  useEffect(() => {
    const actualTheme: AppliedTheme =
      themePreference === "system" ? getSystemTheme() : themePreference;

    applyTheme(actualTheme);
    writeStoredThemePreference(themePreference);

    const mediaQuery =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;

    const handleSystemChange = (event: MediaQueryListEvent) => {
      if (themePreference === "system") {
        applyTheme(event.matches ? "dark" : "light");
      }
    };

    mediaQuery?.addEventListener("change", handleSystemChange);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY && isThemePreference(event.newValue)) {
        setThemePreference(event.newValue);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);
    }

    return () => {
      mediaQuery?.removeEventListener("change", handleSystemChange);
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageChange);
      }
    };
  }, [themePreference, applyTheme]);

  return [themePreference, setThemePreference];
};
