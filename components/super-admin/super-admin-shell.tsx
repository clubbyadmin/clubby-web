"use client";

import { LoadingState } from "@/components/api-state";
import { useAdminSession } from "@/contexts/admin-session-context";
import { firstNameFrom } from "@/lib/admin-rbac";
import { cn } from "@/lib/cn";
import { readStoredAdminUser } from "@/lib/admin-session-storage";
import { getAccessToken } from "@/services/api";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export function SuperAdminShell({ children }: { children: ReactNode }) {
  const { user, setSession, clearSession } = useAdminSession();
  const pathname = usePathname();
  const router = useRouter();
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
    return (
      <div className="flex min-h-full items-center justify-center bg-[#070709] px-5">
        <LoadingState message="Carregando..." />
      </div>
    );
  }

  if (user?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-[#070709] px-5 py-16">
        <div className="w-full max-w-md rounded-3xl border border-zinc-800/80 bg-zinc-950/80 p-8 shadow-2xl shadow-black/40">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/25">
            <ShieldCheck className="size-6" strokeWidth={1.8} />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-zinc-50">
            Acesso restrito
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            Entre com sua conta para continuar.
          </p>
          <Link
            href="/acesso-plataforma"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-zinc-950"
          >
            Entrar na plataforma
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full bg-[#070709] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.08),_transparent_55%)]" />
      <header className="relative z-10 border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20">
              <ShieldCheck className="size-5" strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400/80">
                Clubby
              </p>
              <h1 className="text-sm font-semibold text-zinc-100">
                Painel Super-Admin
              </h1>
            </div>
            <nav className="ml-4 hidden items-center gap-1 sm:flex">
              <Link
                href="/super-admin"
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold",
                  pathname === "/super-admin"
                    ? "bg-amber-300 text-zinc-950"
                    : "text-zinc-400 hover:text-zinc-100",
                )}
              >
                Visão geral
              </Link>
              <Link
                href="/super-admin/parceiros"
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold",
                  pathname.startsWith("/super-admin/parceiros")
                    ? "bg-amber-300 text-zinc-950"
                    : "text-zinc-400 hover:text-zinc-100",
                )}
              >
                Parceiros
              </Link>
              <Link
                href="/super-admin/planos"
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold",
                  pathname.startsWith("/super-admin/planos")
                    ? "bg-amber-300 text-zinc-950"
                    : "text-zinc-400 hover:text-zinc-100",
                )}
              >
                Planos
              </Link>
              <Link
                href="/super-admin/whatsapp"
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold",
                  pathname.startsWith("/super-admin/whatsapp")
                    ? "bg-amber-300 text-zinc-950"
                    : "text-zinc-400 hover:text-zinc-100",
                )}
              >
                WhatsApp
              </Link>
              <Link
                href="/super-admin/financeiro"
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold",
                  pathname.startsWith("/super-admin/financeiro")
                    ? "bg-amber-300 text-zinc-950"
                    : "text-zinc-400 hover:text-zinc-100",
                )}
              >
                Financeiro
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-zinc-200">
                {firstNameFrom(user.name)}
              </p>
              <p className="text-[11px] text-zinc-500">Acesso global</p>
            </div>
            <Link
              href="/admin"
              className="rounded-full border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
            >
              Tenant demo
            </Link>
            <button
              type="button"
              onClick={() => {
                clearSession();
                router.push("/acesso-plataforma");
              }}
              className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-7xl px-5 py-8">
        {children}
      </main>
    </div>
  );
}
