import type { Metadata } from "next";
import { ServicosBoard } from "./servicos-board";

export const metadata: Metadata = {
  title: "Serviços · Painel Gerencial",
  description:
    "Cadastre os serviços do estabelecimento. Os exemplos de barbearia podem ser ajustados.",
};

export default function AdminServicosPage() {
  return <ServicosBoard />;
}
