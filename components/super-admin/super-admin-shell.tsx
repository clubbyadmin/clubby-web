"use client";

import { useAdminSession } from "@/contexts/admin-session-context";
import { firstNameFrom } from "@/lib/admin-rbac";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { SuperAdminGate } from "@/components/super-admin/super-admin-gate";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

export function SuperAdminShell({ children }: { children: ReactNode }) {
  const { user, clearSession } = useAdminSession();
  const pathname = usePathname();
  const router = useRouter();

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
                Operação
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
            {user ? (
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-zinc-200">
                  {firstNameFrom(user.name)}
                </p>
                <p className="text-[11px] text-zinc-500">Acesso global</p>
              </div>
            ) : null}
            <Link
              href="/admin"
              className="rounded-full border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
            >
              Tenant demo
            </Link>
            {user ? (
              <button
                type="button"
                onClick={() => {
                  clearSession();
                  router.push("/login");
                }}
                className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200"
              >
                Sair
              </button>
            ) : null}
          </div>
        </div>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-7xl px-5 py-8">
        <SuperAdminGate>{children}</SuperAdminGate>
      </main>
    </div>
  );
}
