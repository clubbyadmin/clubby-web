"use client";

import { ClientShell } from "@/components/shell/client-shell";
import { isDemoMode } from "@/lib/app-mode";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export default function LegacyAgendarLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const demo = isDemoMode();

  useEffect(() => {
    if (!demo) {
      router.replace("/");
    }
  }, [demo, router]);

  if (!demo) {
    return null;
  }

  return <ClientShell>{children}</ClientShell>;
}
