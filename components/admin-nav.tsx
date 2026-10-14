"use client";

import { useAdminSessionOptional } from "@/contexts/admin-session-context";
import { navItemsForRole, type AdminNavItem } from "@/lib/admin-rbac";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

type AdminNavProps = {
  orientation?: "horizontal" | "vertical";
  className?: string;
};

const GROUP_ORDER = ["Operação", "Receita", "Crescimento", "Conta"] as const;

export function AdminNav(props: AdminNavProps) {
  return (
    <Suspense fallback={null}>
      <AdminNavInner {...props} />
    </Suspense>
  );
}

function AdminNavInner({
  orientation = "horizontal",
  className,
}: AdminNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const session = useAdminSessionOptional();
  const isVertical = orientation === "vertical";
  const search = searchParams.toString();
  const links = navItemsForRole(session?.user?.role);

  if (links.length === 0) {
    return null;
  }

  if (!isVertical) {
    return (
      <nav className={cn("flex gap-1 overflow-x-auto pb-1", className)}>
        {links.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} search={search} />
        ))}
      </nav>
    );
  }

  const groups = GROUP_ORDER.map((label) => ({
    label,
    items: links.filter((item) => item.group === label),
  })).filter((group) => group.items.length > 0);

  return (
    <nav className={cn("flex flex-col gap-5", className)}>
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-600">
            {group.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                search={search}
                vertical
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function NavLink({
  item,
  pathname,
  search,
  vertical = false,
}: {
  item: AdminNavItem;
  pathname: string;
  search: string;
  vertical?: boolean;
}) {
  const active = item.match(pathname, search);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "inline-flex shrink-0 items-center gap-2.5 text-sm font-medium transition",
        vertical ? "rounded-lg px-3 py-2" : "rounded-full px-3 py-2 text-xs",
        active
          ? "bg-zinc-800/80 text-zinc-50"
          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200",
      )}
    >
      <Icon className="size-4" strokeWidth={1.8} />
      {item.label}
    </Link>
  );
}
