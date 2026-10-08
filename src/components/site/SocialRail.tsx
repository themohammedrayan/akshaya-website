"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";
import { trackWhatsAppClick } from "@/lib/analytics";
import { MapPinIcon, PhoneIcon, WhatsAppIcon } from "@/components/site/icons";

/** Quick-contact rail pinned to the left edge on desktop; a WhatsApp bubble on phones. */
export function SocialRail() {
  const { t } = useTranslation();
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const phone = process.env.NEXT_PUBLIC_CENTER_PHONE;
  const address = process.env.NEXT_PUBLIC_CENTER_ADDRESS;

  const items = [
    whatsapp && {
      href: `https://wa.me/${whatsapp}`,
      label: t("landing.ctaWhatsapp"),
      Icon: WhatsAppIcon,
      color: "bg-[#25D366] hover:bg-[#1ebe57]",
      external: true,
      onClick: () => trackWhatsAppClick(),
    },
    phone && {
      href: `tel:${phone}`,
      label: t("footer.phoneLabel"),
      Icon: PhoneIcon,
      color: "bg-brand-700 hover:bg-brand-800",
      external: false,
    },
    address && {
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
      label: t("footer.addressLabel"),
      Icon: MapPinIcon,
      color: "bg-accent-500 hover:bg-accent-600",
      external: true,
    },
  ].filter(Boolean) as {
    href: string;
    label: string;
    Icon: typeof PhoneIcon;
    color: string;
    external: boolean;
    onClick?: () => void;
  }[];

  return (
    <>
      <ul className="fixed left-0 top-1/2 z-30 hidden -translate-y-1/2 flex-col shadow-lg md:flex">
        {items.map(({ href, label, Icon, color, external, onClick }) => (
          <li key={href}>
            <a
              href={href}
              title={label}
              aria-label={label}
              onClick={onClick}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className={`flex h-12 w-12 items-center justify-center text-white transition-[width] hover:w-14 ${color}`}
            >
              <Icon className="h-5 w-5" />
            </a>
          </li>
        ))}
      </ul>

      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackWhatsAppClick()}
          aria-label={t("landing.ctaWhatsapp")}
          className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg md:hidden"
        >
          <WhatsAppIcon className="h-7 w-7" />
        </a>
      )}
    </>
  );
}
