"use client";

import { AccentIconWrap } from "@/components/app-shell";
import { useTenant } from "@/contexts/tenant-context";
import { cn } from "@/lib/cn";
import { Scissors } from "lucide-react";
import Image from "next/image";

type TenantBrandProps = {
  size?: "sm" | "lg";
  showTagline?: boolean;
  className?: string;
};

export function TenantBrand({
  size = "lg",
  showTagline = false,
  className,
}: TenantBrandProps) {
  const { tenant } = useTenant();
  const isLarge = size === "lg";

  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-900 shadow-inner shadow-black/40",
          isLarge ? "mb-5 size-24" : "mb-3 size-16",
        )}
      >
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[color-mix(in_srgb,var(--accent)_20%,transparent)] to-transparent" />
        {tenant.theme.logoUrl.endsWith(".svg") ? (
          <Scissors
            className={cn(
              "relative text-[var(--accent)]",
              isLarge ? "size-10" : "size-7",
            )}
            strokeWidth={2.2}
          />
        ) : (
          <Image
            src={tenant.theme.logoUrl}
            alt={tenant.name}
            width={isLarge ? 56 : 40}
            height={isLarge ? 56 : 40}
            className="relative rounded-2xl object-cover"
          />
        )}
      </div>

      <p className="text-xs font-medium uppercase tracking-[0.24em] text-[color-mix(in_srgb,var(--accent)_90%,white)]">
        {tenant.name}
      </p>

      {showTagline ? (
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-400">
          {tenant.theme.tagline}
        </p>
      ) : null}
    </div>
  );
}

export function TenantBadge({ className }: { className?: string }) {
  const { tenant } = useTenant();

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <AccentIconWrap className="size-11">
        <Scissors className="size-5" strokeWidth={2.2} />
      </AccentIconWrap>
      <div>
        <p className="text-sm font-semibold text-zinc-100">{tenant.name}</p>
        <p className="text-xs text-zinc-500">Painel gerencial</p>
      </div>
    </div>
  );
}
