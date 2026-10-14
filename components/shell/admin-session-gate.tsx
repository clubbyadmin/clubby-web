"use client";

import { LoadingState } from "@/components/api-state";
import { useAdminSession } from "@/contexts/admin-session-context";
import { useTenant } from "@/contexts/tenant-context";
import { demoStaffLogins, LOCAL_ADMIN_USER } from "@/lib/admin-rbac";
import { readStoredAdminUser } from "@/lib/admin-session-storage";
import { api, getAccessToken } from "@/services/api";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

type AdminSessionGateProps = {
  children: ReactNode;
};

export function AdminSessionGate({ children }: AdminSessionGateProps) {
  const { tenant, loading: tenantLoading } = useTenant();
  const { user, setSession } = useAdminSession();
  const [authFailed, setAuthFailed] = useState(false);

  useEffect(() => {
    if (user) {
      return;
    }

    if (tenantLoading) {
      return;
    }

    const storedUser = readStoredAdminUser();
    const storedToken = getAccessToken();
    const sameTenantStaff =
      storedToken &&
      storedUser &&
      storedUser.role !== "CUSTOMER" &&
      storedUser.tenantId === tenant.id;

    if (sameTenantStaff) {
      setSession({
        accessToken: storedToken,
        user: storedUser,
      });
      return;
    }

    if (tenant.id === "local") {
      setSession({
        accessToken: "local-dev",
        user: LOCAL_ADMIN_USER,
      });
      return;
    }

    let cancelled = false;
    const phone =
      demoStaffLogins(tenant.slug)[0]?.phone ??
      process.env.NEXT_PUBLIC_DEMO_ADMIN_PHONE ??
      "5511900000001";
    const password =
      process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD ?? "clubby-admin";

    api
      .login({
        tenantId: tenant.id,
        phone,
        password,
      })
      .then((session) => {
        if (cancelled) {
          return;
        }

        setSession({
          accessToken: session.accessToken,
          user: session.user,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setAuthFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [setSession, tenant.id, tenantLoading, user]);

  if (!user && !authFailed) {
    return <LoadingState message="Autenticando painel..." />;
  }

  if (!user && authFailed) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16 text-center">
        <p className="text-lg font-semibold text-zinc-100">A gestão não entrou.</p>
        <p className="mt-2 text-sm text-zinc-400">
          O acesso automático deste estabelecimento falhou. Entre com o e-mail da equipe.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--accent)] px-4 text-sm font-semibold text-zinc-950"
        >
          Entrar
        </Link>
      </div>
    );
  }

  return children;
}
