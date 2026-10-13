import { AdminShell } from "@/components/shell/admin-shell";
import { AdminRouteGuard } from "@/components/shell/admin-route-guard";
import { AdminSessionGate } from "@/components/shell/admin-session-gate";
import { AdminSessionProvider } from "@/contexts/admin-session-context";
import { LoadingState } from "@/components/api-state";
import type { ReactNode } from "react";
import { Suspense } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminSessionProvider>
      <AdminShell>
        <AdminSessionGate>
          <Suspense fallback={<LoadingState message="Carregando painel..." />}>
            <AdminRouteGuard>{children}</AdminRouteGuard>
          </Suspense>
        </AdminSessionGate>
      </AdminShell>
    </AdminSessionProvider>
  );
}
