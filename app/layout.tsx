import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import NavbarWrapper from "./components/NavbarWrapper";
import AuthSessionHandler from "@/components/auth/AuthSessionHandler";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ProgressiveProfileProvider } from "@/components/buyer/ProgressiveProfileProvider";
import BrandJsonLd from "@/components/seo/BrandJsonLd";
import { BRAND } from "@/lib/brand";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://tech172.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: BRAND.meta.title,
    template: "%s | AreaIQ",
  },
  description: BRAND.meta.description,
  applicationName: BRAND.name,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: BRAND.assets.favicon, sizes: "any" },
      { url: BRAND.assets.favicon16, sizes: "16x16", type: "image/png" },
      { url: BRAND.assets.favicon32, sizes: "32x32", type: "image/png" },
    ],
    shortcut: BRAND.assets.favicon,
    apple: [{ url: BRAND.assets.appleTouch, sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: BRAND.name,
    title: BRAND.meta.title,
    description: BRAND.meta.description,
    images: [
      {
        url: BRAND.assets.hero,
        width: 1200,
        height: 600,
        alt: BRAND.alt.hero,
      },
      {
        url: BRAND.assets.logo,
        width: 1200,
        height: 1200,
        alt: BRAND.alt.logo,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.meta.title,
    description: BRAND.meta.description,
    images: [BRAND.assets.hero],
  },
  appleWebApp: {
    capable: true,
    title: BRAND.name,
    statusBarStyle: "default",
  },
  other: {
    "msapplication-TileColor": "#4AAA27",
  },
};

export const viewport: Viewport = {
  themeColor: "#4AAA27",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <BrandJsonLd />
        <AuthProvider>
          <AuthSessionHandler />
          <ProgressiveProfileProvider>
            <NavbarWrapper />
            {children}
          </ProgressiveProfileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
