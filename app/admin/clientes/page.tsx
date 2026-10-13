import type { Metadata } from "next";
import { ClientesBoard } from "./clientes-board";

export const metadata: Metadata = {
  title: "Clientes · Painel Gerencial",
  description:
    "Ficha de clientes, histórico de atendimentos e central de lembretes.",
};

export default function AdminClientesPage() {
  return <ClientesBoard />;
}
