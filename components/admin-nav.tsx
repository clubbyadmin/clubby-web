"use client";

import { useAdminSessionOptional } from "@/contexts/admin-session-context";
import { navItemsForRole } from "@/lib/admin-rbac";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

type AdminNavProps = {
  orientation?: "horizontal" | "vertical";
  className?: string;
};

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

  return (
    <nav
      className={cn(
        isVertical ? "flex flex-col gap-1" : "flex gap-2 overflow-x-auto pb-1",
        className,
      )}
    >
      {links.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname, search);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full text-xs font-semibold transition",
              isVertical
                ? "justify-start rounded-xl px-4 py-3 text-sm"
                : "min-h-11 px-4 py-2.5",
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
