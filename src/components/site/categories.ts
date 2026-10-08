import { CertificateIcon, FingerprintIcon, LayersIcon } from "@/components/site/icons";

/** Icon and tint per service category, shared by the home page and services list. */
const CATEGORY_META = {
  "e-district": { Icon: CertificateIcon, tint: "bg-brand-50 text-brand-700" },
  aadhaar: { Icon: FingerprintIcon, tint: "bg-accent-50 text-accent-700" },
  other: { Icon: LayersIcon, tint: "bg-emerald-50 text-emerald-700" },
} as const;

export function categoryMeta(category: string) {
  return CATEGORY_META[category as keyof typeof CATEGORY_META] ?? CATEGORY_META.other;
}
