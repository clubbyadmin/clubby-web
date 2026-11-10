import { ClubbyPortal } from "@/components/platform/clubby-portal";
import type { Metadata } from "next";
import { Syne } from "next/font/google";

const portalDisplay = Syne({
  subsets: ["latin"],
  variable: "--font-portal-display",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Clubby · Portal de acesso",
  description:
    "Entre no painel do seu estabelecimento, cadastre seu salão ou abra o portal do cliente pelo link do WhatsApp.",
};

export default function Home() {
  return (
    <div className={`${portalDisplay.variable} min-h-full`}>
      <ClubbyPortal />
    </div>
  );
}
