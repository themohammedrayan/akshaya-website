declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
export const analyticsEnabled = Boolean(GA_MEASUREMENT_ID);

function sendEvent(eventName: string, params: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.gtag || !analyticsEnabled) return;
  window.gtag("event", eventName, params);
}

export function trackWhatsAppClick() {
  sendEvent("whatsapp_click", {});

  const conversionId = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID;
  const label = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL_WHATSAPP;
  if (conversionId && label) {
    sendEvent("conversion", { send_to: `${conversionId}/${label}` });
  }
}

export function trackIntakeSubmit(serviceSlug: string) {
  sendEvent("intake_submit", { service_slug: serviceSlug });

  const conversionId = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID;
  const label = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL_INTAKE;
  if (conversionId && label) {
    sendEvent("conversion", { send_to: `${conversionId}/${label}` });
  }
}
