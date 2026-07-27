"use client";

import { buttonClasses } from "@/components/ui/button-styles";
import { trackWhatsAppClick } from "@/lib/analytics";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function WhatsAppButton({
  message,
  className,
}: {
  message?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const href = `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackWhatsAppClick()}
      className={buttonClasses("whatsapp", className)}
    >
      {t("landing.ctaWhatsapp")}
    </a>
  );
}
