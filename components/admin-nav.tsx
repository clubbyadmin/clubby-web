"use client";

import { cn } from "@/lib/cn";
import { CalendarDays, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  {
    href: "/admin",
    label: "Painel",
    icon: LayoutDashboard,
    match: (path: string) => path === "/admin",
  },
  {
    href: "/admin/agenda",
    label: "Agenda",
    icon: CalendarDays,
    match: (path: string) => path.startsWith("/admin/agenda"),
  },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">
      {links.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition",
              active
                ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]"
                : "bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200",
            )}
          >
            <Icon className="size-3.5" strokeWidth={2.2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
