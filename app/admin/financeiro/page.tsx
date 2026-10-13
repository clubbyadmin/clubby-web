import type { Metadata } from "next";
import { FinanceiroBoard } from "./financeiro-board";

export const metadata: Metadata = {
  title: "Financeiro · Painel Gerencial",
  description:
    "DRE, fluxo de caixa, contas a pagar/receber e repasses da Lei do Salão-Parceiro.",
};

export default function AdminFinanceiroPage() {
  return <FinanceiroBoard />;
}
