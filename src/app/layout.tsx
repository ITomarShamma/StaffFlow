import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { ar } from "@/i18n/ar";
import "./globals.css";

const plex = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: ar.brand,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={plex.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
