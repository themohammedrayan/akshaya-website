export function buildStatusMessage(params: {
  customerName: string;
  trackingCode: string;
  serviceName: string;
  status: string;
}): string {
  const statusText = params.status.replace(/_/g, " ");
  return `Hi ${params.customerName}, this is Akshaya e-Center. Your ${params.serviceName} request (code: ${params.trackingCode}) is now: ${statusText}. You can check status anytime at our website using your tracking code.`;
}

/** wa.me links need a full number with country code, no symbols. Assumes India (+91) for bare 10-digit numbers, matching the rest of the app. */
export function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}
