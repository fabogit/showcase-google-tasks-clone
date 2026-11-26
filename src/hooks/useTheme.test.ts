import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { THEME_STORAGE_KEY, useTheme } from "./useTheme";

describe("useTheme", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.style.removeProperty("color-scheme");
  });

  it("defaults to system preference and applies resolved OS theme", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)",
      media: query,
      onchange: null,
      addListener: vi.fn<() => void>(),
      removeListener: vi.fn<() => void>(),
      addEventListener: vi.fn<MediaQueryList["addEventListener"]>(),
      removeEventListener: vi.fn<MediaQueryList["removeEventListener"]>(),
      dispatchEvent: vi.fn<MediaQueryList["dispatchEvent"]>(() => false),
    }));

    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe("system");
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement.style.getPropertyValue("color-scheme")).toBe("dark");
  });

  it("falls back to system when stored value is invalid", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "neon-purple");
    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe("system");
  });

  it("survives localStorage SecurityError without crashing", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });

    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe("system");

    act(() => {
      result.current[1]("dark");
    });
    expect(result.current[0]).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");
  });

  it("updates applied theme on OS color-scheme changes while in system mode", () => {
    let changeHandler: ((event: MediaQueryListEvent) => void) | undefined;

    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn<() => void>(),
      removeListener: vi.fn<() => void>(),
      addEventListener: vi.fn<
        (_type: string, listener: EventListenerOrEventListenerObject | null) => void
      >((_type, listener) => {
        if (typeof listener === "function") {
          changeHandler = listener as (event: MediaQueryListEvent) => void;
        }
      }),
      removeEventListener: vi.fn<MediaQueryList["removeEventListener"]>(),
      dispatchEvent: vi.fn<MediaQueryList["dispatchEvent"]>(() => false),
    }));

    renderHook(() => useTheme());
    expect(document.documentElement).toHaveClass("light");

    act(() => {
      changeHandler?.({ matches: true } as MediaQueryListEvent);
    });
    expect(document.documentElement).toHaveClass("dark");
  });

  it("synchronizes theme preference across tabs via storage events", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe("system");

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: THEME_STORAGE_KEY,
          newValue: "dark",
        }),
      );
    });

    expect(result.current[0]).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");
  });
});
