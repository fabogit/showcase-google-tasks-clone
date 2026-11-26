const HEX_TABLE: readonly string[] = Array.from({ length: 256 }, (_, index) =>
  index.toString(16).padStart(2, "0"),
);

/**
 * Generates an RFC 4122 v4 UUID using native Web Crypto APIs.
 * Falls back to `crypto.getRandomValues` on non-secure origins where
 * `crypto.randomUUID` is unavailable.
 */
export function createId(): string {
  const cryptoObj = globalThis.crypto;

  if (typeof cryptoObj?.randomUUID === "function") {
    return cryptoObj.randomUUID();
  }

  if (typeof cryptoObj?.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    cryptoObj.getRandomValues(bytes);

    // Set RFC 4122 version (4) and variant (10xx) bits.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    return (
      HEX_TABLE[bytes[0]] +
      HEX_TABLE[bytes[1]] +
      HEX_TABLE[bytes[2]] +
      HEX_TABLE[bytes[3]] +
      "-" +
      HEX_TABLE[bytes[4]] +
      HEX_TABLE[bytes[5]] +
      "-" +
      HEX_TABLE[bytes[6]] +
      HEX_TABLE[bytes[7]] +
      "-" +
      HEX_TABLE[bytes[8]] +
      HEX_TABLE[bytes[9]] +
      "-" +
      HEX_TABLE[bytes[10]] +
      HEX_TABLE[bytes[11]] +
      HEX_TABLE[bytes[12]] +
      HEX_TABLE[bytes[13]] +
      HEX_TABLE[bytes[14]] +
      HEX_TABLE[bytes[15]]
    );
  }

  throw new Error("Web Crypto API is required to generate task identifiers.");
}
