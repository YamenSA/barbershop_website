import localFont from "next/font/local";

export const brand = localFont({
  src: [
    { path: "./fonts/BarlowCondensed-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/BarlowCondensed-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-brand-face",
  display: "swap",
  adjustFontFallback: "Arial",
});

export const text = localFont({
  src: "./fonts/Manrope-Variable.woff2",
  weight: "200 800",
  style: "normal",
  variable: "--font-text-face",
  display: "swap",
});
