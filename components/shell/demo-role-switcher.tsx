"use client";

import { useAdminSession } from "@/contexts/admin-session-context";
import { useTenant } from "@/contexts/tenant-context";
import {
  DEMO_STAFF_LOGINS,
  homePathForRole,
} from "@/lib/admin-rbac";
import { isDemoMode } from "@/lib/app-mode";
import { cn } from "@/lib/cn";
import { api, getErrorMessage } from "@/services/api";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DemoRoleSwitcherProps = {
  compact?: boolean;
  className?: string;
};

export function DemoRoleSwitcher({
  compact = false,
  className,
}: DemoRoleSwitcherProps) {
  const { tenant } = useTenant();
  const { user, setSession } = useAdminSession();
  const router = useRouter();
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isDemoMode() || tenant.id === "local") {
    return null;
  }

  async function switchTo(phone: string, role: string) {
    setPendingRole(role);
    setError(null);

    const password =
      process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD ?? "clubby-admin";

    try {
      const session = await api.login({
        tenantId: tenant.id,
        phone,
        password,
      });

      setSession({
        accessToken: session.accessToken,
        user: session.user,
      });
      router.replace(homePathForRole(session.user.role));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setPendingRole(null);
    }
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-800 bg-zinc-900/90 p-2 text-zinc-400",
        className,
      )}
    >
      <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide">
        Trocar perfil (demo)
      </p>
      <div className={cn("grid gap-1", compact && "grid-cols-3")}>
        {DEMO_STAFF_LOGINS.map((item) => {
          const active = user?.role === item.role && user.phone === item.phone;

          return (
            <button
              key={item.role}
              type="button"
              disabled={pendingRole !== null}
              onClick={() => void switchTo(item.phone, item.role)}
              className={cn(
                "rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-60",
                compact ? "text-center" : "text-left",
                active
                  ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]"
                  : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100",
              )}
            >
              {pendingRole === item.role ? "Entrando..." : item.label}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="px-2 pt-2 text-[11px] text-red-300">{error}</p>
      ) : null}
    </div>
  );
}
