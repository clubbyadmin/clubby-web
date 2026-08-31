import type { Metadata } from "next";
import { ClientArea } from "./client-area";

export const metadata: Metadata = {
  title: "Área do Cliente",
  description: "Acompanhe agendamentos e histórico no Studio Barbearia.",
};

export default function ClientePage() {
  return <ClientArea />;
}
