"use client";

import type { ReactNode } from "react";

/**
 * Mantido para compatibilidade de imports.
 * A autenticação do Super-Admin ficou no SuperAdminShell
 * para não expor a navegação antes do login.
 */
export function SuperAdminGate({ children }: { children: ReactNode }) {
  return children;
}
