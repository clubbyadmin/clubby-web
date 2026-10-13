import type { Metadata } from "next";
import { WhatsappBoard } from "./whatsapp-board";

export const metadata: Metadata = {
  title: "WhatsApp · Painel Gerencial",
  description:
    "Conexão da instância, automações de lembrete e histórico de disparos no WhatsApp.",
};

export default function AdminWhatsappPage() {
  return <WhatsappBoard />;
}
