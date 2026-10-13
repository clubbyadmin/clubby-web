"use client";

import { cn } from "@/lib/cn";
import { CalendarClock, Crown, House, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/cliente", label: "Início", icon: House, exact: true },
  {
    href: "/cliente/agendamentos",
    label: "Agenda",
    icon: CalendarClock,
    exact: false,
  },
  { href: "/cliente/plano", label: "Clube", icon: Crown, exact: false },
  { href: "/cliente/perfil", label: "Perfil", icon: UserRound, exact: false },
] as const;

export function ClientAreaNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 grid grid-cols-4 gap-2">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold transition",
              active
                ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]"
                : "bg-zinc-900/70 text-zinc-400 ring-1 ring-zinc-800",
            )}
          >
            <Icon className="size-4" strokeWidth={2.2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
