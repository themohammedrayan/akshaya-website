import { buildStatusMessage, toWhatsAppNumber } from "@/lib/whatsappTemplates";

export function WhatsAppMessageButton({
  customerName,
  customerPhone,
  trackingCode,
  serviceName,
  status,
}: {
  customerName: string;
  customerPhone: string;
  trackingCode: string;
  serviceName: string;
  status: string;
}) {
  const message = buildStatusMessage({ customerName, trackingCode, serviceName, status });
  const waNumber = toWhatsAppNumber(customerPhone);

  return (
    <a
      href={`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:bg-[#1ebe57]"
    >
      Message on WhatsApp
    </a>
  );
}
