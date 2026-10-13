import type { Metadata } from "next";
import { MeuPainelBoard } from "./meu-painel-board";

export const metadata: Metadata = {
  title: "Meu Painel · Profissional",
  description: "Acompanhe sua agenda e atendimentos do dia.",
};

export default function MeuPainelPage() {
  return <MeuPainelBoard section="agenda" />;
}
