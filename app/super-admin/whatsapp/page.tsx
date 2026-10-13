import type { Metadata } from "next";
import { SuperAdminWhatsappBoard } from "./whatsapp-board";

export const metadata: Metadata = {
  title: "Saúde do WhatsApp · Super-Admin Clubby",
  description:
    "Auditoria técnica das conexões de mensageria de todos os tenants da rede.",
};

export default function SuperAdminWhatsappPage() {
  return <SuperAdminWhatsappBoard />;
}
