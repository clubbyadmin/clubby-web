import type { Metadata } from "next";
import { ScheduleBoard } from "./schedule-board";

export const metadata: Metadata = {
  title: "Agenda · Painel Gerencial",
  description: "Grade de agendamentos do Studio Barbearia.",
};

export default function AdminAgendaPage() {
  return <ScheduleBoard />;
}
