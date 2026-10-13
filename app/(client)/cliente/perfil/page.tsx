import type { Metadata } from "next";
import { ProfileBoard } from "./profile-board";

export const metadata: Metadata = {
  title: "Meu perfil",
  description:
    "Atualize foto, dados pessoais, documento e endereço na área do cliente.",
};

export default function ClientePerfilPage() {
  return <ProfileBoard />;
}
