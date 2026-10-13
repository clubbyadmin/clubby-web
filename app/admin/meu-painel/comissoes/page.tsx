import type { Metadata } from "next";
import { MeuPainelBoard } from "../meu-painel-board";

export const metadata: Metadata = {
  title: "Extrato de Comissões · Profissional",
  description: "Consulte seus repasses e comissões pessoais.",
};

export default function MeuPainelComissoesPage() {
  return <MeuPainelBoard section="comissoes" />;
}
