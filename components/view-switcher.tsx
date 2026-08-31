"use client";

import { cn } from "@/lib/cn";
import { LayoutDashboard, Smartphone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const views = [
  {
    href: "/",
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

export function ViewSwitcher() {
  const pathname = usePathname();
  const isWideAdminView = pathname.startsWith("/admin/agenda");

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mx-auto w-full border-t border-zinc-800/80 bg-zinc-950/95 px-4 py-3 backdrop-blur-md",
        isWideAdminView ? "max-w-7xl md:max-w-[90rem]" : "max-w-md",
      )}
    >
      <div className="grid grid-cols-2 gap-2">
        {views.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-medium transition",
                active
                  ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200",
              )}
            >
              <Icon className="size-4" strokeWidth={2.2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
