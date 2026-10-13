import type { Metadata } from "next";
import { AppointmentsBoard } from "./appointments-board";

export const metadata: Metadata = {
  title: "Meus agendamentos",
  description:
    "Acompanhe horários marcados, histórico e envie para o Google Agenda.",
};

export default function ClienteAgendamentosPage() {
  return <AppointmentsBoard />;
}
