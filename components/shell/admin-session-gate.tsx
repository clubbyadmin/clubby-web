"use client";

import { LoadingState } from "@/components/api-state";
import { useAdminSession } from "@/contexts/admin-session-context";
import { useTenant } from "@/contexts/tenant-context";
import { LOCAL_ADMIN_USER } from "@/lib/admin-rbac";
import { readStoredAdminUser } from "@/lib/admin-session-storage";
import { api, getAccessToken } from "@/services/api";
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

    const storedUser = readStoredAdminUser();
    const storedToken = getAccessToken();

    if (storedToken && storedUser) {
      setSession({
        accessToken: storedToken,
        user: storedUser,
      });
      return;
    }

    if (tenantLoading) {
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
      process.env.NEXT_PUBLIC_DEMO_ADMIN_PHONE ?? "5511900000001";
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

  return children;
}
