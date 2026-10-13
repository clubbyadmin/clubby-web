import type { Metadata } from "next";
import { PlanBoard } from "./plan-board";

export const metadata: Metadata = {
  title: "Meu plano",
  description:
    "Veja o plano ativo, benefícios, limites e a forma de pagamento do clube.",
};

export default function ClientePlanoPage() {
  return <PlanBoard />;
}
