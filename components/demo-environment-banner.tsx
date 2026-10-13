"use client";

import { isDemoMode } from "@/lib/app-mode";
import { FlaskConical } from "lucide-react";

export function DemoEnvironmentBanner() {
  if (!isDemoMode()) {
    return null;
  }

  return (
    <div className="relative z-50 border-b border-amber-400/20 bg-amber-400/10 px-4 py-2 text-center text-xs font-medium text-amber-200">
      <span className="inline-flex items-center justify-center gap-1.5">
        <FlaskConical className="size-3.5" strokeWidth={1.8} />
        Ambiente de demonstração com dados mock — nada aqui é produção.
      </span>
    </div>
  );
}
