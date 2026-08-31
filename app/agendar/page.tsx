import type { Metadata } from "next";
import { BookingFlow } from "./booking-flow";

export const metadata: Metadata = {
  title: "Agendar horário",
  description: "Escolha serviço, profissional e horário no Studio Barbearia.",
};

export default function AgendarPage() {
  return <BookingFlow />;
}
