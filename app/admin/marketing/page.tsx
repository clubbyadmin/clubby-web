import type { Metadata } from "next";
import { MarketingBoard } from "./marketing-board";

export const metadata: Metadata = {
  title: "Marketing · Painel Gerencial",
  description:
    "Campanhas automatizadas, cupons de desconto e histórico de disparos para retenção de clientes.",
};

export default function AdminMarketingPage() {
  return <MarketingBoard />;
}
