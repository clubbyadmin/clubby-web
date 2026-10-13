import type { Metadata } from "next";
import { SuperAdminBoard } from "./super-admin-board";

export const metadata: Metadata = {
  title: "Super-Admin Clubby",
  description:
    "Painel global da plataforma: clientes, faturamento de assinaturas e status dos estabelecimentos.",
};

export default function SuperAdminPage() {
  return <SuperAdminBoard />;
}
