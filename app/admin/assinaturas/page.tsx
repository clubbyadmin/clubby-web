import type { Metadata } from "next";
import { AssinaturasBoard } from "./assinaturas-board";

export const metadata: Metadata = {
  title: "Clube de Assinaturas · Painel Gerencial",
  description:
    "Membros ativos do clube, inadimplência e faturamento recorrente mensal.",
};

export default function AdminAssinaturasPage() {
  return <AssinaturasBoard />;
}
