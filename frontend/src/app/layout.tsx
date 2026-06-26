import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  weight: ["700", "800"],
  subsets: ["latin"],
  variable: "--font-barlow",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com'),
  title: {
    template: "%s | Azzam Barbershop",
    default: "Azzam Barbershop",
  },
  description: "Präzise Schnitte, professionelle Bartpflege — Ihr Barbershop in Cottbus.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${barlowCondensed.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Skip link (WCAG 2.4.1): sr-only at rest; on keyboard focus it appears
            as a high-contrast pill pinned to the TOP-CENTER — deliberately not
            top-left, where the sticky-header logo lives, so it never overlays it.
            Own stacking context (z-[9999]) sits above the z-40 header. */}
        <a
          href="#main-content"
          className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-1/2 focus-visible:-translate-x-1/2 focus-visible:z-[9999] focus-visible:px-5 focus-visible:py-2.5 focus-visible:bg-malachite focus-visible:text-midnight focus-visible:font-semibold focus-visible:text-sm focus-visible:rounded-full focus-visible:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-midnight"
        >
          Zum Inhalt springen
        </a>
        {children}
      </body>
    </html>
  );
}
