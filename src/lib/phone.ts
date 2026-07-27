/** Last-10-digits normalization, matching the get_request_status RPC. */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

export function isValidIndianPhone(phone: string): boolean {
  return normalizePhone(phone).length === 10;
}
