import type { Metadata } from "next";
import { PortalCacheBust } from "@/components/platform/portal-cache-bust";
import { LoginPage } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar · Clubby",
  description: "Acesso ao painel gerencial e ao painel global Super-Admin.",
};

export default function LoginRoute() {
  return (
    <>
      <PortalCacheBust />
      <LoginPage />
    </>
  );
}
