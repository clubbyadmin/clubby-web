"use client";

import { isReservedTenantSlug } from "@/lib/tenant-paths";
import { ArrowRight, Building2, LogIn, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

function slugifyInput(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ClubbyPortal() {
  const router = useRouter();
  const [salonQuery, setSalonQuery] = useState("");
  const [salonError, setSalonError] = useState<string | null>(null);

  function openSalon(event: FormEvent) {
    event.preventDefault();
    let raw = salonQuery.trim();

    try {
      if (raw.includes("://") || raw.includes("clubby.com.br/")) {
        const url = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
        raw = url.pathname.split("/").filter(Boolean)[0] ?? raw;
      }
    } catch {
      /* keep typed value */
    }

    const slug = slugifyInput(raw);

    if (!slug) {
      setSalonError("Digite o link ou o nome do estabelecimento.");
      return;
    }

    if (isReservedTenantSlug(slug)) {
      setSalonError("Esse endereço é reservado. Use o link do seu salão.");
      return;
    }

    setSalonError(null);
    router.push(`/${slug}`);
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-zinc-950 text-zinc-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(245,158,11,0.12),_transparent_45%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-24 size-72 rounded-full bg-amber-400/10 blur-3xl motion-safe:animate-pulse"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-10 size-80 rounded-full bg-orange-500/10 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-full w-full max-w-5xl flex-col px-5 pb-10 pt-8 sm:px-8 sm:pt-12">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-lg font-black text-zinc-950 shadow-lg shadow-amber-500/20">
              C
            </span>
            <div>
              <p className="font-[family-name:var(--font-portal-display)] text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
                Clubby
              </p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-amber-200/80">
                Portal de acesso
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-700 px-4 text-sm font-semibold text-zinc-100 transition hover:border-amber-300/50 hover:text-amber-100"
          >
            <LogIn className="size-4" />
            Entrar
          </Link>
        </header>

        <main className="flex flex-1 flex-col justify-center py-12 sm:py-16">
          <div className="max-w-2xl animate-portal-fade">
            <p className="font-[family-name:var(--font-portal-display)] text-5xl font-semibold leading-none tracking-tight text-zinc-50 sm:text-7xl">
              Clubby
            </p>
            <h1 className="mt-5 text-xl font-medium leading-snug text-zinc-100 sm:text-2xl">
              O acesso do seu salão, barbearia ou clínica.
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              Entre no painel, cadastre o estabelecimento ou abra o portal do
              cliente com o link do WhatsApp.
            </p>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap animate-portal-rise">
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-6 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/25 transition hover:brightness-105 active:scale-[0.98]"
            >
              <LogIn className="size-4" />
              Entrar no painel
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/parceiro"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-zinc-600 bg-zinc-900/70 px-6 text-sm font-semibold text-zinc-100 transition hover:border-amber-300/40 hover:bg-zinc-900"
            >
              <Building2 className="size-4 text-amber-300" />
              Cadastrar meu estabelecimento
            </Link>
          </div>

          <form
            onSubmit={openSalon}
            className="mt-10 max-w-xl rounded-3xl border border-zinc-800/90 bg-zinc-950/70 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur-sm animate-portal-rise sm:p-5"
          >
            <label className="block text-sm font-medium text-zinc-200">
              Sou cliente — abrir o salão
            </label>
            <p className="mt-1 text-xs text-zinc-500">
              Cole o link completo ou digite o identificador (ex.: studio-barber).
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                <input
                  value={salonQuery}
                  onChange={(event) => {
                    setSalonQuery(event.target.value);
                    setSalonError(null);
                  }}
                  placeholder="nome-do-salao ou https://app.clubby.com.br/..."
                  className="h-12 w-full rounded-2xl border border-zinc-800 bg-zinc-950 py-2 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-100 px-5 text-sm font-semibold text-zinc-950 transition hover:bg-white"
              >
                <Sparkles className="size-4" />
                Abrir portal
              </button>
            </div>
            {salonError ? (
              <p className="mt-2 text-sm text-red-300">{salonError}</p>
            ) : null}
          </form>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-900 pt-6 text-xs text-zinc-500">
          <p>Clubby · operação de salões, barbearias e clínicas</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-zinc-300">
              Gestão
            </Link>
            <Link href="/parceiro" className="hover:text-zinc-300">
              Seja parceiro
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
