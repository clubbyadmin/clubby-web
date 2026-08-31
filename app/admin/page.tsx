import type { Metadata } from "next";
import { AdminDashboard } from "./admin-dashboard";

export const metadata: Metadata = {
  title: "Painel Gerencial",
  description: "Gestão do estabelecimento Studio Barbearia.",
};

export default function AdminPage() {
  return <AdminDashboard />;
}
