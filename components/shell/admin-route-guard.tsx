"use client";

import { LoadingState } from "@/components/api-state";
import { useAdminSession } from "@/contexts/admin-session-context";
import {
  canAccessAdminPath,
  homePathForRole,
} from "@/lib/admin-rbac";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";

type AdminRouteGuardProps = {
  children: ReactNode;
};

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const { user } = useAdminSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const search = searchParams.toString();
  const role = user?.role ?? null;
  const allowed = canAccessAdminPath(pathname, search, role);
  const home = homePathForRole(role);

  useEffect(() => {
    if (!allowed) {
      router.replace(home);
    }
  }, [allowed, home, router]);

  if (!allowed) {
    return <LoadingState message="Redirecionando para o seu painel..." />;
  }

  return children;
}
