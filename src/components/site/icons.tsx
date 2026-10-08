// Inline stroke icons for the public site (no icon library dependency),
// same conventions as components/dashboard/icons.tsx.
type IconProps = { className?: string };

function Svg({ className = "h-5 w-5", children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" />
  </Svg>
);
export const GridIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </Svg>
);
export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);
export const FilePlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />
    <path d="M14 3v6h6M12 12v6M9 15h6" />
  </Svg>
);
export const CertificateIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7" />
    <path d="M14 3v6h6v3M8 9h3M8 13h6M8 17h3" />
    <circle cx="18" cy="17" r="3" />
    <path d="m16.5 19.5-.5 2.5 2-1 2 1-.5-2.5" />
  </Svg>
);
export const FingerprintIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 11v3a8 8 0 0 1-1.5 4.5M8.5 21A12 12 0 0 0 9 14v-3a3 3 0 0 1 6 0v1M15 16a16 16 0 0 1-1 5M5 18.5A12 12 0 0 0 6 14v-3a6 6 0 0 1 10.5-4M18 10.5c.3.8.5 1.6.5 2.5v1a20 20 0 0 1-.4 3.5M3.5 9A9 9 0 0 1 7 4.5" />
  </Svg>
);
export const LayersIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 3 9 5-9 5-9-5Z" />
    <path d="m3 13 9 5 9-5M3 17.5l9 5 9-5" />
  </Svg>
);
export const PhoneIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </Svg>
);
export const MailIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Svg>
);
export const MapPinIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z" />
    <circle cx="12" cy="9" r="2.5" />
  </Svg>
);
export const ClockIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);
export const UserIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Svg>
);
export const InfoIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Svg>
);
export const MenuIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Svg>
);
export const XIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);
export const ChevronLeftIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m15 18-6-6 6-6" />
  </Svg>
);
export const ChevronRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 18 6-6-6-6" />
  </Svg>
);
export const ArrowRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
export const CheckCircleIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12 3 3 5-6" />
  </Svg>
);
export const RupeeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 4h12M6 9h12M9 4c6 0 6 10 0 10H6l8 7" />
  </Svg>
);
export const LanguagesIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5h8M8 3v2M10 5c-1 4-3.5 7-6 8M6 9c1 2 3 3.5 5 4" />
    <path d="m12 21 4-9 4 9M13.5 18h5" />
  </Svg>
);
export const ShieldIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
);
export const MegaphoneIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1ZM17 9a4 4 0 0 1 0 6M7 14l1.5 6h3L10 15" />
  </Svg>
);
export const ExternalLinkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Svg>
);
export const QuestionIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01" />
  </Svg>
);

/** WhatsApp glyph (filled, brand mark). */
export const WhatsAppIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
  </svg>
);
