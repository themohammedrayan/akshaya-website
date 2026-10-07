import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Checks Meta's X-Hub-Signature-256 header ("sha256=<hex>") against an
 * HMAC-SHA256 of the raw request body keyed with the app secret. Must be run
 * on the exact bytes received - re-serialized JSON won't match.
 */
export function verifySignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header?.startsWith("sha256=") || !appSecret) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest();
  let received: Buffer;
  try {
    received = Buffer.from(header.slice("sha256=".length), "hex");
  } catch {
    return false;
  }
  return received.length === expected.length && timingSafeEqual(received, expected);
}
