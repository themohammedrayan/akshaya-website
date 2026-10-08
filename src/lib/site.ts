// Public-site content that isn't in the database: partner logos, official
// portal links and the "Latest updates" ticker. Edit here; text shown to
// visitors lives in the i18n dictionaries under the referenced keys.

/**
 * Partner logos shown at the right of the header, as on akshaya.kerala.gov.in.
 * Drop the image into /public/partners/ and set `src`; until then a text
 * badge is shown in its place.
 */
export const PARTNERS: { name: string; short: string; href: string; src: string | null }[] = [
  { name: "Government of Kerala", short: "Govt. of Kerala", href: "https://kerala.gov.in", src: "/partners/kerala-govt.webp" },
  { name: "Kerala State IT Mission", short: "KSITM", href: "https://itmission.kerala.gov.in", src: "/partners/ksitm.webp" },
  { name: "Kerala IT", short: "Kerala IT", href: "https://www.keralait.org", src: "/partners/kerala-it.webp" },
  { name: "Common Service Centres", short: "CSC", href: "https://csc.gov.in", src: "/partners/csc.webp" },
];

/** Official portals listed in the footer. */
export const OFFICIAL_LINKS: { label: string; href: string }[] = [
  { label: "Akshaya (official)", href: "https://akshaya.kerala.gov.in" },
  { label: "e-District Kerala", href: "https://edistrict.kerala.gov.in" },
  { label: "UIDAI – Aadhaar", href: "https://uidai.gov.in" },
  { label: "Kerala State IT Mission", href: "https://itmission.kerala.gov.in" },
  { label: "CSC Digital Seva", href: "https://digitalseva.csc.gov.in" },
];

/** i18n keys (under `notices.`) for the scrolling "Latest updates" bar. */
export const NOTICE_KEYS = ["n1", "n2", "n3"] as const;

/**
 * Home page hero slides. Text comes from `hero.<key>Kicker/Title/Body`.
 * Set `image` to a file in /public/hero/ to show a photo/banner behind the
 * text (a dark overlay keeps it readable); null shows the brand gradient.
 */
export const HERO_SLIDES: {
  key: "welcome" | "edistrict" | "aadhaar";
  image: string | null;
  cta: { href: string; labelKey: string };
}[] = [
  { key: "welcome", image: "/hero/akshaya-centres.webp", cta: { href: "/request", labelKey: "landing.ctaStart" } },
  { key: "edistrict", image: "/hero/akshaya-staff.webp", cta: { href: "/services#e-district", labelKey: "hero.ctaServices" } },
  // Photo: Aadhaar enrolment camp, Moonniyur, Malappuram (PIB / Govt. of India, GODL-India).
  { key: "aadhaar", image: "/hero/aadhaar-enrolment.webp", cta: { href: "/services#aadhaar", labelKey: "hero.ctaServices" } },
];
