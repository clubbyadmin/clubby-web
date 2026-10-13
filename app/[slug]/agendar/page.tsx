import { BookingFlow } from "@/app/(client)/agendar/booking-flow";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agendar horário",
  description: "Escolha serviço, profissional e horário.",
};

export default function TenantAgendarPage() {
  return <BookingFlow />;
}
