import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { LanguageProvider, type Lang } from "@/lib/i18n/LanguageProvider";
import { Analytics } from "@/components/Analytics";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Akshaya e-Center",
  description:
    "e-District certificates, Aadhaar enrolment and government services — fees, processing time and documents required, all upfront.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLang: Lang = cookieStore.get("lang")?.value === "ml" ? "ml" : "en";

  return (
    <html
      lang={initialLang}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider initialLang={initialLang}>{children}</LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
