/** Mirrors src/lib/phone.ts's normalizePhone(), which mirrors get_request_status's own matching logic. */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}
