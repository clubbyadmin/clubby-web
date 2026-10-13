import { AdminSessionProvider } from "@/contexts/admin-session-context";
import { SuperAdminShell } from "@/components/super-admin/super-admin-shell";
import type { ReactNode } from "react";

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminSessionProvider>
      <SuperAdminShell>{children}</SuperAdminShell>
    </AdminSessionProvider>
  );
}
