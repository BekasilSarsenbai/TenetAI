import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { LocaleProvider } from "@/lib/i18n";

// One typeface across the whole landing — Manrope (Cyrillic included).
const sans = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tenet.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Tenet — never rewatch a recording again",
  description:
    "Tenet records, transcribes and summarizes every meeting and call, then hands you the summary in seconds. Jump to any moment in one click — and never sit through a recording again.",
  openGraph: {
    title: "Tenet — never rewatch a recording again",
    description:
      "An AI notetaker for every call. Get the summary in seconds and jump to any moment in one click. Never sit through a recording again.",
    url: siteUrl,
    siteName: "Tenet",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable}`}
    >
      <body>
        <LocaleProvider>{children}</LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}
