import type { Metadata } from "next";
import { ClientArea } from "./client-area";

export const metadata: Metadata = {
  title: "Área do Cliente",
  description: "Perfil, plano do clube, agendamentos e histórico.",
};

export default function ClientePage() {
  return <ClientArea />;
}
