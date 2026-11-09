import type { Metadata } from "next";
import { PlanFeesBoard } from "./plan-fees-board";

export const metadata: Metadata = {
  title: "Planos · Super-Admin Clubby",
  description: "Valores padrão de mensalidade por plano SaaS.",
};

export default function PlanosPage() {
  return <PlanFeesBoard />;
}
