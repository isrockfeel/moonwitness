import type { Metadata } from "next";
import localFont from "next/font/local";
import { SkipLink } from "@moonwitness/ui";
import "./globals.css";

// Saksi — proprietary MoonWitness type family (see packages/assets/fonts).
const brush = localFont({
  src: [
    { path: "../../public/fonts/saksi-marker-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/saksi-marker-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-brush",
  display: "swap",
});
const hand = localFont({
  src: [
    { path: "../../public/fonts/saksi-hand-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/saksi-hand-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-hand",
  display: "swap",
});
const mono = localFont({
  src: [
    { path: "../../public/fonts/saksi-mono-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/saksi-mono-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Moonwitness — People. Places. Stories. Another side of reality.",
    template: "%s | Moonwitness",
  },
  description:
    "A global story network for curious humans. Different people. Same moon. Bigger perspectives.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${brush.variable} ${hand.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
