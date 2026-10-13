"use client";

import { ClientShell } from "@/components/shell/client-shell";
import { TenantGate, TenantProvider } from "@/contexts/tenant-context";
import type { ReactNode } from "react";

type TenantPublicShellProps = {
  slug: string;
  children: ReactNode;
};

export function TenantPublicShell({ slug, children }: TenantPublicShellProps) {
  return (
    <TenantProvider slug={slug}>
      <ClientShell showSwitcher={false}>
        <TenantGate strict>{children}</TenantGate>
      </ClientShell>
    </TenantProvider>
  );
}
