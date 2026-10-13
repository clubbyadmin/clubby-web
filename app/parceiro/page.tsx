import type { Metadata } from "next";
import { PartnerOnboarding } from "./partner-onboarding";

export const metadata: Metadata = {
  title: "Seja um parceiro Clubby",
  description:
    "Cadastre seu salão, barbearia ou clínica e personalize a experiência pelo tipo de negócio.",
};

export default function PartnerPage() {
  return <PartnerOnboarding />;
}
