import { TenantProvider } from "@/contexts/tenant-context";
import { AppShell } from "@/components/app-shell";
import { SerwistProvider } from "@serwist/turbopack/react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clubby Barbearia",
  description:
    "Agende horários e gerencie sua experiência no Studio Barbearia.",
  applicationName: "Clubby Barbearia",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Clubby Barbearia",
  },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#09090b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-950 font-sans text-zinc-100">
        <SerwistProvider swUrl="/serwist/sw.js">
          <TenantProvider>
            <AppShell>{children}</AppShell>
          </TenantProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
