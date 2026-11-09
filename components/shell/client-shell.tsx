"use client";

import { CustomerEntry } from "@/app/[slug]/customer-entry";
import { ViewSwitcher } from "@/components/shell/view-switcher";
import { ShellGradient } from "@/components/shell/accent-ui";
import { TenantBrand } from "@/components/tenant-brand";
import { LoadingState } from "@/components/api-state";
import { useTenant, useTenantThemeStyle } from "@/contexts/tenant-context";
import {
  readStoredAccessToken,
  readStoredAdminUser,
  writeStoredAdminUser,
} from "@/lib/admin-session-storage";
import { isDemoMode } from "@/lib/app-mode";
import { setAccessToken } from "@/services/api";
import { useEffect, useState, type ReactNode } from "react";

type ClientShellProps = {
  children: ReactNode;
  showSwitcher?: boolean;
};

export function ClientShell({
  children,
  showSwitcher,
}: ClientShellProps) {
  const themeStyle = useTenantThemeStyle();
  const { tenant, loading } = useTenant();
  const customer = useShopCustomer(tenant.id);
  const identified = Boolean(customer.user);
  const switcherVisible = showSwitcher ?? isDemoMode();

  return (
    <div
      style={themeStyle}
      className="flex min-h-full w-full flex-col bg-zinc-950 md:bg-zinc-900/40"
    >
      <div className="relative mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col border-x border-zinc-800/60 bg-zinc-950 shadow-[0_0_80px_rgba(0,0,0,0.45)] md:min-h-[100dvh]">
        <ShellGradient />
        <div
          className={
            switcherVisible
              ? "relative flex min-h-full flex-1 flex-col pb-20"
              : "relative flex min-h-full flex-1 flex-col"
          }
        >
          {loading || !customer.ready ? (
            <div className="px-5 pt-10">
              <LoadingState message="Carregando o salão..." />
            </div>
          ) : identified ? (
            <>
              <div className="flex items-center justify-between gap-3 px-5 pt-4 text-sm">
                <p className="min-w-0 truncate text-zinc-300">
                  Olá, {customer.user?.name}
                </p>
                <button
                  type="button"
                  className="shrink-0 text-xs font-semibold text-zinc-400"
                  onClick={() => {
                    setAccessToken(null);
                    writeStoredAdminUser(null);
                    window.dispatchEvent(new Event("clubby-customer-session"));
                  }}
                >
                  Sair
                </button>
              </div>
              {children}
            </>
          ) : (
            <div className="flex flex-1 flex-col px-5 pb-8 pt-10">
              <header className="flex flex-col items-center text-center">
                <TenantBrand showTagline />
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-50">
                  {tenant.name}
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  Para usar o salão, entre com seu e-mail ou crie a conta. O celular é obrigatório e localiza o cadastro feito pelo WhatsApp.
                </p>
              </header>
              <CustomerEntry />
            </div>
          )}
        </div>
        {switcherVisible ? <ViewSwitcher mode="client" /> : null}
      </div>
    </div>
  );
}

function useShopCustomer(tenantId: string) {
  const [user, setUser] = useState<ReturnType<typeof readStoredAdminUser>>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const stored = readStoredAdminUser();
      const token = readStoredAccessToken();
      setUser(
        stored?.role === "CUSTOMER" && stored.tenantId === tenantId && token
          ? stored
          : null,
      );
      setReady(true);
    };

    refresh();
    window.addEventListener("clubby-customer-session", refresh);
    return () => window.removeEventListener("clubby-customer-session", refresh);
  }, [tenantId]);

  return { user, ready };
}
