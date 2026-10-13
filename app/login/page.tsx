import type { Metadata } from "next";
import { LoginPage } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar · Clubby",
  description: "Acesso ao painel gerencial e ao painel global Super-Admin.",
};

export default function LoginRoute() {
  return <LoginPage />;
}
