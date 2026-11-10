import type { Metadata } from "next";
import { Syne } from "next/font/google";
import { PortalCacheBust } from "@/components/platform/portal-cache-bust";
import { LoginPage } from "../login/login-form";

const portalDisplay = Syne({
  subsets: ["latin"],
  variable: "--font-portal-display",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Plataforma · Clubby",
  description: "Acesso à operação global Clubby.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PlatformLoginRoute() {
  return (
    <div className={`${portalDisplay.variable} min-h-full`}>
      <PortalCacheBust />
      <LoginPage audience="platform" />
    </div>
  );
}
