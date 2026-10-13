"use client";

import { ViewSwitcher } from "@/components/shell/view-switcher";
import { ShellGradient } from "@/components/shell/accent-ui";
import { useTenantThemeStyle } from "@/contexts/tenant-context";
import type { ReactNode } from "react";

type ClientShellProps = {
  children: ReactNode;
  showSwitcher?: boolean;
};

export function ClientShell({
  children,
  showSwitcher = true,
}: ClientShellProps) {
  const themeStyle = useTenantThemeStyle();

  return (
    <div
      style={themeStyle}
      className="flex min-h-full w-full flex-col bg-zinc-950 md:bg-zinc-900/40"
    >
      <div className="relative mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col border-x border-zinc-800/60 bg-zinc-950 shadow-[0_0_80px_rgba(0,0,0,0.45)] md:min-h-[100dvh]">
        <ShellGradient />
        <div
          className={
            showSwitcher
              ? "relative flex min-h-full flex-1 flex-col pb-20"
              : "relative flex min-h-full flex-1 flex-col"
          }
        >
          {children}
        </div>
        {showSwitcher ? <ViewSwitcher mode="client" /> : null}
      </div>
    </div>
  );
}
