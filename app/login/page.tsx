import type { Metadata } from "next";
import { Syne } from "next/font/google";
import { PortalCacheBust } from "@/components/platform/portal-cache-bust";
import { LoginPage } from "./login-form";

const portalDisplay = Syne({
  subsets: ["latin"],
  variable: "--font-portal-display",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Entrar · Clubby",
  description: "Acesso ao painel gerencial e ao painel global Super-Admin.",
};

export default function LoginRoute() {
  return (
    <div className={`${portalDisplay.variable} min-h-full`}>
      <PortalCacheBust />
      <LoginPage />
    </div>
  );
}
