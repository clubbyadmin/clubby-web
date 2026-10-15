"use client";

import { AdminNav } from "@/components/admin-nav";
import { AdminMobileNav } from "@/components/shell/admin-mobile-nav";
import { DemoRoleSwitcher } from "@/components/shell/demo-role-switcher";
import { ShellGradient } from "@/components/shell/accent-ui";
import { ViewSwitcher } from "@/components/shell/view-switcher";
import { TenantBadge } from "@/components/tenant-brand";
import { useAdminSessionOptional } from "@/contexts/admin-session-context";
import { useTenantThemeStyle } from "@/contexts/tenant-context";
import {
  firstNameFrom,
  isManagerRole,
  ROLE_LABELS,
} from "@/lib/admin-rbac";
import { isDemoMode } from "@/lib/app-mode";
import { useRouter } from "next/navigation";
import { Suspense, type ReactNode } from "react";

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const themeStyle = useTenantThemeStyle();
  const session = useAdminSessionOptional();
  const router = useRouter();
  const role = session?.user?.role ?? null;
  const showClientSwitcher = isDemoMode() && isManagerRole(role);
  const user = session?.user;

  return (
    <div
      style={themeStyle}
      className="flex min-h-full w-full flex-col bg-zinc-950"
    >
      <div className="relative flex min-h-full w-full flex-1 lg:flex-row">
        <aside className="relative hidden w-64 shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950 p-6 lg:flex">
          <TenantBadge />
          <p className="mt-3 text-xs text-zinc-500">
            {role === "PROFESSIONAL"
              ? "Painel do profissional"
              : role === "RECEPTIONIST"
                ? "Recepção"
                : "Painel gerencial"}
          </p>
          <div className="mt-8">
            <AdminNav orientation="vertical" />
          </div>
          <div className="mt-auto space-y-3 pt-8">
            {user ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
                <p className="text-sm font-semibold text-zinc-100">
                  {firstNameFrom(user.name)}
                </p>
                <p className="text-xs text-zinc-500">{ROLE_LABELS[user.role]}</p>
                <button
                  type="button"
                  onClick={() => {
                    session?.clearSession();
                    router.push("/login");
                  }}
                  className="mt-3 w-full rounded-full bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-300 ring-1 ring-zinc-800 hover:text-zinc-100"
                >
                  Sair
                </button>
              </div>
            ) : null}
            <DemoRoleSwitcher />
            {showClientSwitcher ? <ViewSwitcher mode="admin" /> : null}
          </div>
        </aside>

        <div className="relative flex min-h-full min-w-0 flex-1 flex-col">
          <ShellGradient />
          <div className="sticky top-0 z-20 flex items-start justify-between gap-3 px-4 pt-4 lg:hidden">
            <DemoRoleSwitcher compact className="min-w-0 flex-1" />
            {user ? (
              <button
                type="button"
                onClick={() => {
                  session?.clearSession();
                  router.push("/login");
                }}
                className="shrink-0 rounded-full bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 ring-1 ring-zinc-800"
              >
                Sair
              </button>
            ) : null}
          </div>
          <main className="relative flex min-h-full flex-1 flex-col pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8">
            {children}
          </main>
          <Suspense fallback={null}>
            <AdminMobileNav />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
