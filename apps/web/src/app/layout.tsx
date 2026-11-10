import type { Metadata } from "next";
import { Permanent_Marker, Caveat, Space_Mono } from "next/font/google";
import "./globals.css";

const brush = Permanent_Marker({ subsets: ["latin"], weight: "400", variable: "--font-brush" });
const hand = Caveat({ subsets: ["latin"], variable: "--font-hand" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });

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
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
