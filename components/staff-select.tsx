"use client";

import { cn } from "@/lib/cn";
import { Check, ChevronDown, Search, Users } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

export type StaffSelectOption = {
  id: string;
  name: string;
  email?: string | null;
};

type StaffSelectProps = {
  value: string;
  onChange: (value: string) => void;
  staff: StaffSelectOption[];
  includeAll?: boolean;
  allLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

const ALL_VALUE = "all";

export function StaffSelect({
  value,
  onChange,
  staff,
  includeAll = false,
  allLabel = "Visão geral da equipe",
  placeholder = "Selecionar profissional",
  disabled = false,
  className,
}: StaffSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = staff.find((member) => member.id === value) ?? null;
  const showingAll = includeAll && value === ALL_VALUE;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return staff;
    }

    return staff.filter((member) => {
      const haystack = `${member.name} ${member.email ?? ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [query, staff]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => searchRef.current?.focus(), 0);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center gap-3 rounded-xl text-left outline-none disabled:opacity-60"
      >
        <Avatar
          name={showingAll ? "Equipe" : selected?.name}
          team={showingAll}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-zinc-100">
            {showingAll ? allLabel : selected?.name || placeholder}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
            {showingAll
              ? staff.length === 1
                ? "1 profissional"
                : `${staff.length} profissionais`
              : selected?.email || "Sem e-mail de acesso"}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-zinc-500 transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl shadow-black/50"
        >
          <div className="border-b border-zinc-800 p-2">
            <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
              <Search className="size-3.5 shrink-0 text-zinc-500" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nome ou e-mail"
                className="min-h-8 w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
              />
            </label>
          </div>

          <ul className="max-h-72 overflow-y-auto p-1">
            {includeAll ? (
              <li>
                <OptionButton
                  selected={showingAll}
                  onClick={() => choose(ALL_VALUE)}
                  leading={<Avatar name="Equipe" team />}
                  title={allLabel}
                  subtitle="Todos os horários da equipe"
                />
              </li>
            ) : null}

            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-zinc-500">
                Nenhum profissional encontrado.
              </li>
            ) : (
              filtered.map((member) => (
                <li key={member.id}>
                  <OptionButton
                    selected={member.id === value}
                    onClick={() => choose(member.id)}
                    leading={<Avatar name={member.name} />}
                    title={member.name}
                    subtitle={member.email || "Sem e-mail de acesso"}
                  />
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Avatar({
  name,
  team = false,
}: {
  name?: string;
  team?: boolean;
}) {
  if (team) {
    return (
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]">
        <Users className="size-4" strokeWidth={2.2} />
      </span>
    );
  }

  return (
    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-semibold text-zinc-100 ring-1 ring-zinc-700">
      {initials(name)}
    </span>
  );
}

function OptionButton({
  selected,
  onClick,
  leading,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  leading: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 rounded-xl px-2 py-2 text-left",
        selected
          ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
          : "hover:bg-zinc-900",
      )}
    >
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-zinc-50">
          {title}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-zinc-400">
          {subtitle}
        </span>
      </span>
      {selected ? (
        <Check className="size-4 shrink-0 text-[var(--accent)]" />
      ) : null}
    </button>
  );
}

function initials(name?: string) {
  if (!name) {
    return "?";
  }

  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}
