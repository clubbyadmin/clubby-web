"use client";

import { StaffSelect } from "@/components/staff-select";
import { cn } from "@/lib/cn";
import {
  generateTimeSlots,
  minutesToLabel,
} from "@/lib/schedule-data";
import type { ApiWaitlistEntry } from "@/services/api";
import { Hourglass, Plus, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";

type StaffMember = {
  id: string;
  name: string;
  email: string | null;
};

type ServiceOption = {
  id: string;
  name: string;
  durationMinutes: number;
};

type CustomerOption = {
  id: string;
  name: string;
};

type WaitlistForm = {
  clientId: string;
  serviceId: string;
  staffId: string;
  startTime: string;
};

type WaitlistPanelProps = {
  entries: ApiWaitlistEntry[];
  loading: boolean;
  staff: StaffMember[];
  services: ServiceOption[];
  customers: CustomerOption[];
  submitting: boolean;
  onJoin: (form: WaitlistForm) => Promise<void>;
};

export function WaitlistPanel({
  entries,
  loading,
  staff,
  services,
  customers,
  submitting,
  onJoin,
}: WaitlistPanelProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState<WaitlistForm>({
    clientId: customers[0]?.id ?? "",
    serviceId: services[0]?.id ?? "",
    staffId: "all",
    startTime: "09:00",
  });
  const timeSlots = useMemo(() => generateTimeSlots(), []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onJoin(form);
    setOpen(false);
  }

  return (
    <section className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <Hourglass className="size-4 text-zinc-500" strokeWidth={1.8} />
          <span className="text-sm font-medium text-zinc-200">
            Fila de espera
          </span>
          <span className="text-xs text-zinc-500">{entries.length}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setForm({
              clientId: customers[0]?.id ?? "",
              serviceId: services[0]?.id ?? "",
              staffId: "all",
              startTime: "09:00",
            });
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-zinc-700"
        >
          <Plus className="size-3.5" />
          Incluir na fila
        </button>
      </div>

      {expanded && loading ? (
        <p className="mt-3 text-sm text-zinc-500">Carregando fila...</p>
      ) : null}

      {expanded && !loading && entries.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">
          Ninguém esperando neste dia.
        </p>
      ) : null}

      {expanded && !loading && entries.length > 0 ? (
        <ul className="mt-3 grid gap-2 lg:grid-cols-2">
          {entries.map((entry, index) => (
            <li
              key={entry.id}
              className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-3"
            >
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-[var(--accent)] ring-1 ring-zinc-800">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <UserRound className="size-3.5 text-zinc-500" />
                  <span className="truncate text-sm font-semibold text-zinc-100">
                    {entry.client.name}
                  </span>
                </span>
                <span className="mt-1 block text-xs text-zinc-400">
                  {entry.service.name} · {entry.targetTimeSlot}
                </span>
                <span className="mt-0.5 block text-[11px] text-zinc-500">
                  {entry.acceptsAnyProfessional
                    ? "Aceita qualquer profissional"
                    : `Prefere ${entry.preferredProfessional?.name ?? "profissional específico"}`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 md:items-center">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-50">
                Incluir na fila de espera
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-zinc-800 p-2 text-zinc-400"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Cliente
                </span>
                <select
                  value={form.clientId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      clientId: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none [color-scheme:dark]"
                >
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Serviço
                </span>
                <select
                  value={form.serviceId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      serviceId: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none [color-scheme:dark]"
                >
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Profissional
                  </span>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5">
                    <StaffSelect
                      value={form.staffId}
                      onChange={(staffId) =>
                        setForm((current) => ({ ...current, staffId }))
                      }
                      staff={staff}
                      includeAll
                      allLabel="Qualquer profissional"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Horário desejado
                  </span>
                  <select
                    value={form.startTime}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        startTime: event.target.value,
                      }))
                    }
                    className={cn(
                      "w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none [color-scheme:dark]",
                    )}
                  >
                    {timeSlots.map((slot) => (
                      <option key={slot} value={minutesToLabel(slot)}>
                        {minutesToLabel(slot)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting || !form.clientId || !form.serviceId}
                className="w-full rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50"
              >
                {submitting ? "Salvando..." : "Entrar na fila"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
