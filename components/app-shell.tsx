"use client";

import { useTenantThemeStyle } from "@/contexts/tenant-context";
import { cn } from "@/lib/cn";
import { ViewSwitcher } from "@/components/view-switcher";
import type { ComponentProps, ReactNode } from "react";
import { usePathname } from "next/navigation";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const themeStyle = useTenantThemeStyle();
  const pathname = usePathname();
  const isWideAdminView = pathname.startsWith("/admin/agenda");

  return (
    <div
      style={themeStyle}
      className={cn(
        "relative mx-auto flex min-h-full w-full flex-col border-x border-zinc-800/60 bg-zinc-950 shadow-[0_0_80px_rgba(0,0,0,0.45)]",
        isWideAdminView
          ? "max-w-7xl md:max-w-[90rem]"
          : "max-w-md",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[color-mix(in_srgb,var(--accent)_12%,transparent)] via-transparent to-transparent"
      />
      <div className="relative flex min-h-full flex-1 flex-col pb-20">
        {children}
      </div>
      <ViewSwitcher />
    </div>
  );
}

type AccentProps = {
  className?: string;
  children: ReactNode;
};

export function AccentText({ className, children }: AccentProps) {
  return (
    <span className={cn("text-[var(--accent)]", className)}>{children}</span>
  );
}

export function AccentButton({
  className,
  children,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-5 py-4 text-sm font-semibold text-zinc-950 shadow-lg shadow-[color-mix(in_srgb,var(--accent)_20%,transparent)] transition active:scale-[0.98]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function AccentIconWrap({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_20%,transparent)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
