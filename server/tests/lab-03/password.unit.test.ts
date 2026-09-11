import { describe, expect, it } from "vitest";
import { hashPassword, validateInitialPassword, verifyPassword } from "../../src/auth/password.js";

describe("Initial credential hashing", () => {
  it.each([undefined, "", "a".repeat(11), "a".repeat(129), " ".repeat(12)])("rejects invalid initial password %#", (password) => {
    expect(() => validateInitialPassword(password)).toThrow();
  });

  it.each(["a".repeat(12), "a".repeat(128), "\u{1f512}".repeat(128)])("accepts code-point/UTF-8 boundaries %#", (password) => {
    expect(() => validateInitialPassword(password)).not.toThrow();
  });

  it("uses independent salts and preserves whitespace rather than trimming a password", async () => {
    const password = "  initial password  ";
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    expect(first).not.toBe(second);
    expect(first).not.toContain(password);
    expect(await verifyPassword(password, first)).toBe(true);
    expect(await verifyPassword(password.trim(), first)).toBe(false);
    expect(await verifyPassword("incorrect password", first)).toBe(false);
  }, 20_000);

  it("rejects malformed, unsupported and oversized verification inputs safely", async () => {
    for (const encoded of ["plaintext", "scrypt$v1$999999999$8$1$abc$def", "scrypt$v2$131072$8$1$abc$def", ""]) {
      expect(await verifyPassword("initial password", encoded)).toBe(false);
    }
    expect(await verifyPassword("a".repeat(129), "invalid")).toBe(false);
  });
});
