"use client";

import { cn } from "@/lib/cn";
import { tenantHref } from "@/lib/tenant-paths";
import { useTenant } from "@/contexts/tenant-context";
import { LayoutDashboard, Smartphone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type ViewSwitcherProps = {
  mode: "client" | "admin";
};

export function ViewSwitcher({ mode }: ViewSwitcherProps) {
  const pathname = usePathname();
  const { tenant } = useTenant();
  const clientHome = tenantHref(tenant.slug);

  const views = [
    {
      href: clientHome,
      label: "Cliente",
      icon: Smartphone,
      match: (path: string) => !path.startsWith("/admin"),
    },
    {
      href: "/admin",
      label: "Gestão",
      icon: LayoutDashboard,
      match: (path: string) => path.startsWith("/admin"),
    },
  ] as const;

  return (
    <nav
      className={cn(
        "z-50 border-t border-zinc-800/80 bg-zinc-950",
        mode === "client"
          ? "fixed inset-x-0 bottom-0 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          : "fixed inset-x-0 bottom-0 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:border-t-0 lg:bg-transparent lg:px-0 lg:py-0",
      )}
    >
      <div
        className={cn(
          "grid grid-cols-2 gap-2",
          mode === "client" && "mx-auto w-full max-w-lg",
          mode === "admin" && "lg:grid-cols-1 lg:gap-1",
        )}
      >
        {views.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);

          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                  return;
                }

                event.preventDefault();
                window.location.assign(href);
              }}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-medium transition",
                active
                  ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200",
                mode === "admin" && "lg:justify-start lg:px-4",
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={2.2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
