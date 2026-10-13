import type { Metadata } from "next";
import { brand, text, legacyDisplay, legacyText } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com'),
  title: {
    template: "%s | Azzam Salon",
    default: "Azzam Salon",
  },
  description: "Friseur für Damen und Herren in Cottbus. Schnitt, Farbe, Bart und Styling, mit oder ohne Termin.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${legacyDisplay.variable} ${legacyText.variable} ${brand.variable} ${text.variable} h-full antialiased`}
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
