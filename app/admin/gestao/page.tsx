import type { Metadata } from "next";
import { GestaoBoard } from "./gestao-board";

export const metadata: Metadata = {
  title: "Metas e unidades · Painel Gerencial",
  description:
    "Acompanhe metas de faturamento da equipe e alterne entre unidades da rede.",
};

export default function AdminGestaoPage() {
  return <GestaoBoard />;
}
