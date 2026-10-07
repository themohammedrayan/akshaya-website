import type { Metadata } from "next";
import { PrivacyContent } from "@/components/PrivacyContent";

export const metadata: Metadata = {
  title: "Privacy policy | Akshaya e-Center",
  description: "What information we collect through the website and WhatsApp, why, and how to have it removed.",
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
