"use client";

import { ClientAreaNav } from "@/components/client-area-nav";
import { ErrorState, LoadingState } from "@/components/api-state";
import { PageHeader } from "@/components/page-header";
import { useTenant } from "@/contexts/tenant-context";
import {
  buildGoogleCalendarUrl,
  buildWebcalHref,
  downloadIcs,
  type CalendarEvent,
} from "@/lib/calendar-links";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/mock-data";
import {
  api,
  getErrorMessage,
  mapApiAppointmentToClientView,
  type ClientAppointmentView,
} from "@/services/api";
import {
  CalendarClock,
  CalendarPlus,
  CalendarX2,
  Clock3,
  Download,
  History,
  Scissors,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type AgendaTab = "upcoming" | "past";

const statusLabels: Record<ClientAppointmentView["status"], string> = {
  CONFIRMED: "Confirmado",
  PENDING: "Pendente",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Falta",
};

const statusStyles: Record<ClientAppointmentView["status"], string> = {
  CONFIRMED: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  PENDING: "bg-amber-400/10 text-amber-400 ring-amber-400/20",
  COMPLETED: "bg-zinc-500/10 text-zinc-400 ring-zinc-500/20",
  CANCELLED: "bg-red-500/10 text-red-400 ring-red-500/20",
  NO_SHOW: "bg-rose-500/10 text-rose-300 ring-rose-500/20",
};

export function AppointmentsBoard() {
  const { tenant } = useTenant();
  const tenantId = tenant.id === "local" ? undefined : tenant.id;
  const [appointments, setAppointments] = useState<ClientAppointmentView[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<AgendaTab>("upcoming");
  const [actionId, setActionId] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    if (!tenantId) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profile = await api.getCustomerProfile({ tenantId });
      const response = await api.getAppointments({
        tenantId,
        clientId: profile.user.id,
      });
      setAppointments(response.map(mapApiAppointmentToClientView));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  const { upcomingAppointments, pastAppointments } = useMemo(() => {
    const now = Date.now();
    const upcoming: ClientAppointmentView[] = [];
    const past: ClientAppointmentView[] = [];

    appointments.forEach((appointment) => {
      const isPast =
        appointment.status === "COMPLETED" ||
        appointment.status === "CANCELLED" ||
        appointment.status === "NO_SHOW" ||
        new Date(appointment.startTime).getTime() < now;

      if (isPast) {
        past.push(appointment);
      } else {
        upcoming.push(appointment);
      }
    });

    upcoming.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
    past.sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    );

    return { upcomingAppointments: upcoming, pastAppointments: past };
  }, [appointments]);

  async function handleCancel(appointmentId: string) {
    setActionId(appointmentId);
    try {
      await api.cancelAppointment(appointmentId);
      await loadAppointments();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setActionId(null);
    }
  }

  function toCalendarEvent(
    appointment: ClientAppointmentView,
  ): CalendarEvent {
    return {
      id: appointment.id,
      title: `${appointment.service} · ${tenant.name}`,
      details: `Com ${appointment.professional} no ${tenant.name}.`,
      location: tenant.name,
      start: new Date(appointment.startTime),
      end: new Date(appointment.endTime),
    };
  }

  if (loading) {
    return (
      <div className="relative flex flex-1 flex-col px-5 pb-8 pt-8">
        <PageHeader
          title="Agendamentos"
          subtitle="Próximos horários e histórico"
          backHref="/cliente"
        />
        <LoadingState message="Carregando sua agenda..." />
      </div>
    );
  }

  if (error && appointments.length === 0) {
    return (
      <div className="relative flex flex-1 flex-col px-5 pb-8 pt-8">
        <PageHeader
          title="Agendamentos"
          subtitle="Próximos horários e histórico"
          backHref="/cliente"
        />
        <ErrorState message={error} onRetry={() => void loadAppointments()} />
      </div>
    );
  }

  const visible =
    tab === "upcoming" ? upcomingAppointments : pastAppointments;

  return (
    <div className="relative flex flex-1 flex-col px-5 pb-8 pt-8">
      <PageHeader
        title="Agendamentos"
        subtitle="Horários, profissionais e status"
        backHref="/cliente"
      />
      <ClientAreaNav />

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-1">
        {(
          [
            { id: "upcoming", label: "Agendados", count: upcomingAppointments.length },
            { id: "past", label: "Anteriores", count: pastAppointments.length },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold",
              tab === item.id
                ? "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]"
                : "text-zinc-400",
            )}
          >
            {item.label}
            <span className="rounded-full bg-zinc-950 px-1.5 py-0.5 text-[10px] text-zinc-400">
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {error ? (
        <p className="mb-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-8 text-center text-sm text-zinc-500">
          {tab === "upcoming" ? (
            <>
              Nenhum horário marcado.{" "}
              <Link href="/agendar" className="text-[var(--accent)] underline">
                Agendar agora
              </Link>
            </>
          ) : (
            "Nenhum atendimento anterior."
          )}
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((appointment) => {
            const event = toCalendarEvent(appointment);
            const past = tab === "past";

            return (
              <article
                key={appointment.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-zinc-100">
                      {appointment.service}
                    </h3>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-zinc-400">
                      <UserRound className="size-3.5 text-[var(--accent)]" />
                      {appointment.professional}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1",
                      statusStyles[appointment.status],
                    )}
                  >
                    {statusLabels[appointment.status]}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="size-3.5 text-[var(--accent)]" />
                    {appointment.date}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="size-3.5 text-[var(--accent)]" />
                    {appointment.time}
                  </span>
                  {past ? (
                    <span className="ml-auto font-semibold text-[var(--accent)]">
                      {formatCurrency(appointment.price)}
                    </span>
                  ) : null}
                </div>

                {appointment.services.length > 1 ? (
                  <p className="mt-2 text-[11px] text-zinc-500">
                    {appointment.services.join(" · ")}
                  </p>
                ) : null}

                {!past && appointment.status !== "CANCELLED" ? (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <a
                      href={buildGoogleCalendarUrl(event)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-zinc-800 px-3 text-xs font-semibold text-zinc-200"
                    >
                      <CalendarPlus className="size-3.5 text-[var(--accent)]" />
                      Google Agenda
                    </a>
                    <button
                      type="button"
                      onClick={() => downloadIcs(event)}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-zinc-800 px-3 text-xs font-semibold text-zinc-200"
                    >
                      <Download className="size-3.5 text-[var(--accent)]" />
                      .ics / Apple
                    </button>
                    <a
                      href={buildWebcalHref(event)}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-zinc-800 px-3 text-xs font-semibold text-zinc-200"
                    >
                      webcal
                    </a>
                    <button
                      type="button"
                      disabled={actionId === appointment.id}
                      onClick={() => void handleCancel(appointment.id)}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 text-xs font-medium text-red-400 disabled:opacity-50"
                    >
                      <CalendarX2 className="size-3.5" />
                      {actionId === appointment.id ? "Cancelando..." : "Cancelar"}
                    </button>
                  </div>
                ) : past ? (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
                    {appointment.status === "NO_SHOW" ? (
                      <>
                        <History className="size-3.5" />
                        Registrado como falta
                      </>
                    ) : (
                      <>
                        <Scissors className="size-3.5" />
                        Atendimento no histórico
                      </>
                    )}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {tab === "upcoming" ? (
        <Link
          href="/agendar"
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950"
        >
          Novo agendamento
        </Link>
      ) : null}
    </div>
  );
}
