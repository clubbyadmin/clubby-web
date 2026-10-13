import type { Metadata } from "next";
import { ComissoesBoard } from "./comissoes-board";

export const metadata: Metadata = {
  title: "Comissões e fechamento · Painel Gerencial",
  description:
    "Fechamento de caixa e repasses da equipe conforme a Lei do Salão-Parceiro.",
};

export default function AdminComissoesPage() {
  return <ComissoesBoard />;
}
