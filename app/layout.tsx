import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import NavbarWrapper from "./components/NavbarWrapper";
import AuthSessionHandler from "@/components/auth/AuthSessionHandler";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ProgressiveProfileProvider } from "@/components/buyer/ProgressiveProfileProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AreaIQ",
    template: "%s | AreaIQ",
  },
  description: "AI Powered Real Estate Intelligence Platform",
  applicationName: "AreaIQ",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "AreaIQ",
    statusBarStyle: "default",
  },
  other: {
    "msapplication-TileColor": "#22C55E",
  },
};

export const viewport: Viewport = {
  themeColor: "#22C55E",
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
