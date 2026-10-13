import type { Metadata } from "next";
import { EstoqueBoard } from "./estoque-board";

export const metadata: Metadata = {
  title: "Estoque · Painel Gerencial",
  description: "Gestão de insumos, revenda e alertas de estoque baixo.",
};

export default function AdminEstoquePage() {
  return <EstoqueBoard />;
}
