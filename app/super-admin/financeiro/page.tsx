import type { Metadata } from "next";
import { SuperAdminFinanceiroBoard } from "./financeiro-board";

export const metadata: Metadata = {
  title: "Financeiro global · Super-Admin Clubby",
  description:
    "Volume transacionado da rede, faturamento da plataforma e auditoria dos parceiros.",
};

export default function SuperAdminFinanceiroPage() {
  return <SuperAdminFinanceiroBoard />;
}
