import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

import NavbarWrapper from "./components/NavbarWrapper";
import AuthSessionHandler from "@/components/auth/AuthSessionHandler";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ProgressiveProfileProvider } from "@/components/buyer/ProgressiveProfileProvider";
import CompareQueueBar from "@/components/buyer/CompareQueueBar";
import { ToastProvider } from "@/components/ui/Toast";
import BrandJsonLd from "@/components/seo/BrandJsonLd";
import MainContent from "@/components/layout/MainContent";
import LayoutProvider from "@/components/layout/engine/LayoutProvider";
import StabilityProvider from "@/components/stability/StabilityProvider";
import OnboardingTourProvider from "@/components/onboarding/OnboardingTourProvider";
import { BRAND } from "@/lib/brand";
import { APP_VERSION } from "@/lib/stability/version";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://tech172.com";

const supabaseOrigin = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
})();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: BRAND.meta.title,
    template: "%s | AreaIQ",
  },
  description: BRAND.meta.description,
  applicationName: BRAND.name,
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: BRAND.assets.favicon, sizes: "any", type: "image/png" },
      { url: BRAND.assets.faviconIco, sizes: "any" },
      { url: BRAND.assets.favicon16, sizes: "16x16", type: "image/png" },
      { url: BRAND.assets.favicon32, sizes: "32x32", type: "image/png" },
      { url: BRAND.assets.android192, sizes: "192x192", type: "image/png" },
    ],
    shortcut: [BRAND.assets.favicon, BRAND.assets.faviconIco],
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
    "areaiq-app-version": APP_VERSION,
  },
};

export const viewport: Viewport = {
  themeColor: "#4AAA27",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <head>
        {supabaseOrigin ? (
          <>
            <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        ) : null}
      </head>
      <body className="min-h-full flex flex-col">
        <BrandJsonLd />
        <StabilityProvider>
          <AuthProvider>
            <AuthSessionHandler />
            <ProgressiveProfileProvider>
              <LayoutProvider>
                <ToastProvider>
                  <NavbarWrapper />
                  <MainContent>{children}</MainContent>
                  <CompareQueueBar />
                  <OnboardingTourProvider />
                </ToastProvider>
              </LayoutProvider>
            </ProgressiveProfileProvider>
          </AuthProvider>
        </StabilityProvider>
      </body>
    </html>
  );
}
