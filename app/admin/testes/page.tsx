import type { Metadata } from "next";
import { TestesBoard } from "./testes-board";

export const metadata: Metadata = {
  title: "Ambiente de Testes · Painel Gerencial",
  description:
    "Popular o tenant de demonstração e abrir visões mobile para validação.",
};

export default function AdminTestesPage() {
  return <TestesBoard />;
}
