import type { Metadata } from "next";
import { UsuariosBoard } from "./usuarios-board";

export const metadata: Metadata = {
  title: "Usuários e permissões · Painel Gerencial",
  description:
    "Cadastre e edite colaboradores. O e-mail é a chave de acesso e identifica o estabelecimento.",
};

export default function AdminUsuariosPage() {
  return <UsuariosBoard />;
}
