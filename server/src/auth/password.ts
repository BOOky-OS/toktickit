import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const options = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };

export function validateInitialPassword(value: unknown): asserts value is string {
  if (typeof value !== "string" || [...value].length < 12 || [...value].length > 128
    || Buffer.byteLength(value, "utf8") > 512 || !/\S/u.test(value)) {
    throw new Error("Initial password must contain 12-128 Unicode code points, at most 512 UTF-8 bytes, and non-whitespace text.");
  }
}

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, options,
    (error, key) => error ? reject(error) : resolve(key)));
}

export async function hashPassword(password: string): Promise<string> {
  validateInitialPassword(password);
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$v1$131072$8$1$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  if (!password || [...password].length > 128 || Buffer.byteLength(password, "utf8") > 512) return false;
  const match = /^scrypt\$v1\$131072\$8\$1\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(encoded);
  if (!match) return false;
  const key = await derive(password, Buffer.from(match[1], "hex"));
  return timingSafeEqual(key, Buffer.from(match[2], "hex"));
}
