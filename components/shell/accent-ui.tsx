import { cn } from "@/lib/cn";
import type { ComponentProps, ReactNode } from "react";

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

export function ShellGradient() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[color-mix(in_srgb,var(--accent)_12%,transparent)] via-transparent to-transparent"
    />
  );
}
