import type { Metadata } from "next";
import { Geist_Mono, Inter, Noto_Sans_Malayalam } from "next/font/google";
import { cookies } from "next/headers";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { langFromCookie } from "@/lib/i18n/dictionary";
import { Analytics } from "@/components/Analytics";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Malayalam glyphs aren't in Inter; the browser falls through to this for them.
const notoMalayalam = Noto_Sans_Malayalam({
  variable: "--font-malayalam",
  subsets: ["malayalam"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Akshaya Thelakkad", template: "%s | Akshaya Thelakkad" },
  description:
    "e-District certificates, Aadhaar enrolment and government services — fees, processing time and documents required, all upfront.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLang = langFromCookie(cookieStore.get("lang")?.value);

  return (
    <html
      lang={initialLang}
      className={`${inter.variable} ${notoMalayalam.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider initialLang={initialLang}>{children}</LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
