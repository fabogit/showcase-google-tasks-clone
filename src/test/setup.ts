import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vite-plus/test";

function createMatchMediaMock(): (query: string) => MediaQueryList {
  return (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn<(listener: (ev: MediaQueryListEvent) => void) => void>(),
    removeListener: vi.fn<(listener: (ev: MediaQueryListEvent) => void) => void>(),
    addEventListener: vi.fn<MediaQueryList["addEventListener"]>(),
    removeEventListener: vi.fn<MediaQueryList["removeEventListener"]>(),
    dispatchEvent: vi.fn<MediaQueryList["dispatchEvent"]>(() => false),
  });
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: vi.fn<(query: string) => MediaQueryList>(createMatchMediaMock()),
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});
