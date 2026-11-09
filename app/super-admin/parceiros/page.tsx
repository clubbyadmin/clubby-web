import type { Metadata } from "next";
import { PartnersBoard } from "./partners-board";

export const metadata: Metadata = {
  title: "Parceiros · Super-Admin Clubby",
  description:
    "Centro de controle dos estabelecimentos: plano, verticais, completude e ficha.",
};

export default function PartnersPage() {
  return <PartnersBoard />;
}
