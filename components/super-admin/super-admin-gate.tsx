"use client";

import { LoadingState } from "@/components/api-state";
import { useAdminSession } from "@/contexts/admin-session-context";
import { readStoredAdminUser } from "@/lib/admin-session-storage";
import { getAccessToken } from "@/services/api";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

type SuperAdminGateProps = {
  children: ReactNode;
};

export function SuperAdminGate({ children }: SuperAdminGateProps) {
  const { user, setSession } = useAdminSession();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (user) {
      setHydrated(true);
      return;
    }

    const storedUser = readStoredAdminUser();
    const storedToken = getAccessToken();

    if (storedToken && storedUser?.role === "SUPER_ADMIN") {
      setSession({
        accessToken: storedToken,
        user: storedUser,
      });
    }

    setHydrated(true);
  }, [setSession, user]);

  if (!hydrated) {
    return <LoadingState message="Carregando painel da plataforma..." />;
  }

  if (user?.role === "SUPER_ADMIN") {
    return children;
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-5 py-16">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800/80 bg-zinc-950/80 p-8 shadow-2xl shadow-black/40">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/25">
          <ShieldCheck className="size-6" strokeWidth={1.8} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-zinc-50">
          Super-Admin Clubby
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          Em produção o acesso global exige e-mail, senha e código MFA. Entre
          pela tela de login da plataforma.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-zinc-950"
        >
          Ir para o login
        </Link>
      </div>
    </div>
  );
}
