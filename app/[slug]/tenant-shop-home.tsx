"use client";

import { BookingFlow } from "@/app/(client)/agendar/booking-flow";
import { CustomerEntry } from "@/app/[slug]/customer-entry";
import { TenantBrand } from "@/components/tenant-brand";
import { useTenant } from "@/contexts/tenant-context";
import { formatCurrency } from "@/lib/mock-data";
import { tenantHref } from "@/lib/tenant-paths";
import {
  Clock3,
  MapPin,
  MessageCircle,
  Scissors,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";

const WEEKDAYS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

function professionalRoleLabel(role: string) {
  if (role === "PROFESSIONAL") {
    return "Profissional";
  }

  return role;
}

export function TenantShopHome() {
  const { tenant } = useTenant();
  const bookHref = tenantHref(tenant.slug, "/agendar");
  const services = tenant.services ?? [];
  const professionals = tenant.professionals ?? [];
  const workingHours = tenant.workingHours ?? [];
  const address = tenant.address;
  const whatsappHref = tenant.whatsappNumber
    ? `https://wa.me/${tenant.whatsappNumber.replace(/\D/g, "")}`
    : null;
  const mapsHref = address?.formatted
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.formatted)}`
    : null;

  return (
    <div className="relative flex flex-1 flex-col px-5 pb-8 pt-10">
      <header className="flex flex-col items-center text-center">
        <TenantBrand showTagline />
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-50">
          {tenant.name}
        </h1>
      </header>

      {address?.formatted ? (
        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-[var(--accent)] ring-1 ring-zinc-800">
              <MapPin className="size-4" strokeWidth={2.2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Endereço
              </p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-200">
                {address.formatted}
              </p>
              {mapsHref ? (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs font-semibold text-[var(--accent)]"
                >
                  Ver no mapa
                </a>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link
          href={bookHref}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950"
        >
          <Sparkles className="size-4" strokeWidth={2.4} />
          Agendar
        </Link>
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-200"
          >
            <MessageCircle className="size-4" strokeWidth={2.2} />
            WhatsApp
          </a>
        ) : (
          <Link
            href="/cliente"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-200"
          >
            Área do Cliente
          </Link>
        )}
      </div>

      <CustomerEntry />

      <section className="mt-10">
        <div className="mb-3 flex items-center gap-2">
          <Scissors className="size-4 text-[var(--accent)]" strokeWidth={2.2} />
          <h2 className="text-sm font-semibold text-zinc-200">Serviços</h2>
        </div>
        {services.length === 0 ? (
          <p className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-6 text-center text-sm text-zinc-400">
            Nenhum serviço publicado no momento.
          </p>
        ) : (
          <ul className="space-y-2">
            {services.map((service) => (
              <li key={service.id}>
                <Link
                  href={bookHref}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 transition hover:border-zinc-700"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-zinc-100">
                      {service.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-zinc-500">
                      {service.durationMin} min
                      {service.description ? ` · ${service.description}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-[var(--accent)]">
                    {formatCurrency(service.price)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <UserRound className="size-4 text-[var(--accent)]" strokeWidth={2.2} />
          <h2 className="text-sm font-semibold text-zinc-200">Equipe</h2>
        </div>
        {professionals.length === 0 ? (
          <p className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-6 text-center text-sm text-zinc-400">
            Nenhum profissional disponível no momento.
          </p>
        ) : (
          <ul className="space-y-2">
            {professionals.map((professional) => (
              <li
                key={professional.id}
                className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3"
              >
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-[var(--accent)] ring-1 ring-zinc-800">
                  <UserRound className="size-5" strokeWidth={2.2} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-zinc-100">
                    {professional.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    {professional.email ?? professionalRoleLabel(professional.role)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {workingHours.length > 0 ? (
        <section className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <Clock3 className="size-4 text-[var(--accent)]" strokeWidth={2.2} />
            <h2 className="text-sm font-semibold text-zinc-200">Horários</h2>
          </div>
          <ul className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80">
            {workingHours.map((slot) => (
              <li
                key={slot.dayOfWeek}
                className="flex items-center justify-between gap-3 border-b border-zinc-800/80 px-4 py-3 last:border-b-0"
              >
                <span className="text-sm text-zinc-300">
                  {WEEKDAYS[slot.dayOfWeek] ?? `Dia ${slot.dayOfWeek}`}
                </span>
                <span className="text-sm font-medium text-zinc-100">
                  {slot.openTime} – {slot.closeTime}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section id="agendar" className="mt-10 scroll-mt-6">
        <BookingFlow embedded />
      </section>

      <footer className="mt-auto pt-10 text-center">
        <Link href="/cliente" className="text-xs text-zinc-500 underline">
          Já é cliente? Acesse sua área
        </Link>
        <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-zinc-600">
          Powered by Clubby
        </p>
      </footer>
    </div>
  );
}
