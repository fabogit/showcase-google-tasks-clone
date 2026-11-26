import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { createId } from "./id";

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("createId", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generates valid RFC 4122 v4 UUIDs", () => {
    const id = createId();
    expect(id).toMatch(UUID_V4_REGEX);
  });

  it("generates unique identifiers across consecutive calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => createId()));
    expect(ids.size).toBe(100);
  });

  it("falls back to crypto.getRandomValues when crypto.randomUUID is unavailable", () => {
    const originalCrypto = globalThis.crypto;
    vi.stubGlobal("crypto", {
      getRandomValues: originalCrypto.getRandomValues.bind(originalCrypto),
    });

    const id = createId();
    expect(id).toMatch(UUID_V4_REGEX);
  });
});
