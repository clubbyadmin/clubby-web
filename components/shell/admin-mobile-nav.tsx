"use client";

import { useAdminSessionOptional } from "@/contexts/admin-session-context";
import { isDemoMode } from "@/lib/app-mode";
import { navItemsForRole, type AdminNavItem } from "@/lib/admin-rbac";
import { cn } from "@/lib/cn";
import { LayoutGrid, Smartphone } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const THUMB_HREFS = [
  "/admin/agenda",
  "/admin/meu-painel",
  "/admin/clientes",
  "/admin/whatsapp",
  "/admin/meu-painel/comissoes",
];

const GROUP_ORDER = ["Operação", "Receita", "Crescimento", "Conta"] as const;

export function AdminMobileNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const session = useAdminSessionOptional();
  const search = searchParams.toString();
  const links = navItemsForRole(session?.user?.role);
  const [moreOpen, setMoreOpen] = useState(false);
  const thumb = THUMB_HREFS.flatMap((href) => {
    const item = links.find((link) => link.href === href);
    return item ? [item] : [];
  });
  const more = links.filter((item) => !thumb.some((tab) => tab.href === item.href));
  const moreActive = more.some((item) => item.match(pathname, search));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname, search]);

  if (links.length === 0) {
    return null;
  }

  return (
    <>
      {moreOpen ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMoreOpen(false)}
        />
      ) : null}
      {moreOpen ? (
        <section
          className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 max-h-[70vh] overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-950 px-4 pb-4 pt-3 lg:hidden"
          aria-label="Demais áreas"
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-700" />
          {GROUP_ORDER.map((label) => {
            const items = more.filter((item) => item.group === label);
            if (items.length === 0) {
              return null;
            }

            return (
              <div key={label} className="mb-4">
                <p className="px-1 pb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-600">
                  {label}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {items.map((item) => (
                    <MoreLink key={item.href} item={item} pathname={pathname} search={search} />
                  ))}
                </div>
              </div>
            );
          })}
          {isDemoMode() ? (
            <Link
              href="/"
              className="mt-1 flex items-center gap-2 rounded-2xl border border-zinc-800 px-3 py-3 text-sm text-zinc-300"
            >
              <Smartphone className="size-4" strokeWidth={2} />
              Ver a área do cliente
            </Link>
          ) : null}
        </section>
      ) : null}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800 bg-zinc-950 px-2 pt-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] lg:hidden"
        aria-label="Controle do salão"
      >
        <div
          className="mx-auto grid max-w-lg"
          style={{ gridTemplateColumns: `repeat(${thumb.length + (more.length > 0 ? 1 : 0)}, minmax(0, 1fr))` }}
        >
          {thumb.map((item) => (
            <TabLink key={item.href} item={item} pathname={pathname} search={search} />
          ))}
          {more.length > 0 ? (
            <button
              type="button"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((open) => !open)}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold",
                moreOpen || moreActive ? "text-[var(--accent)]" : "text-zinc-400",
              )}
            >
              <LayoutGrid className="size-5" strokeWidth={2} />
              Mais
            </button>
          ) : null}
        </div>
      </nav>
    </>
  );
}

function TabLink({
  item,
  pathname,
  search,
}: {
  item: AdminNavItem;
  pathname: string;
  search: string;
}) {
  const active = item.match(pathname, search);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold",
        active ? "text-[var(--accent)]" : "text-zinc-400",
      )}
    >
      <Icon className="size-5" strokeWidth={2} />
      {item.label}
    </Link>
  );
}

function MoreLink({
  item,
  pathname,
  search,
}: {
  item: AdminNavItem;
  pathname: string;
  search: string;
}) {
  const active = item.match(pathname, search);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm font-medium",
        active
          ? "border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-zinc-50"
          : "border-zinc-800 bg-zinc-900 text-zinc-200",
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.8} />
      {item.label}
    </Link>
  );
}
