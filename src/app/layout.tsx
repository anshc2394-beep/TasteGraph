import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./experience.css";
import "./cinematic.css";
import "./dark-direction.css";
import "./product.css";

const display = localFont({
  src: [
    { path: "../../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-600-italic.woff2", weight: "600", style: "italic" },
  ],
  variable: "--font-display", display: "swap",
});
const body = localFont({
  src: "../../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
  variable: "--font-body", weight: "200 800", display: "swap",
});

export const metadata: Metadata = {
  title: "TasteGraph",
  description: "Discover the patterns behind your music taste.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
