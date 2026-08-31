"use client";

import { ErrorState, LoadingState } from "@/components/api-state";
import { PageHeader } from "@/components/page-header";
import {
  formatCurrency,
  pastAppointments,
  upcomingAppointments,
  type AppointmentStatus,
} from "@/lib/mock-data";
import { api, getErrorMessage, mapApiCustomerProfile } from "@/services/api";
import {
  CalendarClock,
  CalendarX2,
  Clock3,
  History,
  Mail,
  Phone,
  RefreshCw,
  Scissors,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const statusLabels: Record<AppointmentStatus, string> = {
  CONFIRMED: "Confirmado",
  PENDING: "Pendente",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

const statusStyles: Record<AppointmentStatus, string> = {
  CONFIRMED: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  PENDING: "bg-amber-400/10 text-amber-400 ring-amber-400/20",
  COMPLETED: "bg-zinc-500/10 text-zinc-400 ring-zinc-500/20",
  CANCELLED: "bg-red-500/10 text-red-400 ring-red-500/20",
};

type CustomerProfile = ReturnType<typeof mapApiCustomerProfile>;

export function ClientArea() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClientData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const customers = await api.getUsers({ role: "CUSTOMER" });

      if (customers.length === 0) {
        setProfile(null);
        return;
      }

      setProfile(mapApiCustomerProfile(customers[0]));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    api
      .getUsers({ role: "CUSTOMER" })
      .then((customers) => {
        if (cancelled) {
          return;
        }

        if (customers.length === 0) {
          setProfile(null);
        } else {
          setProfile(mapApiCustomerProfile(customers[0]));
        }

        setLoading(false);
      })
      .catch((requestError: unknown) => {
        if (cancelled) {
          return;
        }

        setError(getErrorMessage(requestError));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="relative flex flex-1 flex-col px-5 pb-8 pt-8">
        <PageHeader
          title="Área do Cliente"
          subtitle="Seus agendamentos e histórico"
        />
        <LoadingState message="Carregando perfil do cliente..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex flex-1 flex-col px-5 pb-8 pt-8">
        <PageHeader
          title="Área do Cliente"
          subtitle="Seus agendamentos e histórico"
        />
        <ErrorState message={error} onRetry={() => void loadClientData()} />
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col px-5 pb-8 pt-8">
      <PageHeader
        title="Área do Cliente"
        subtitle="Seus agendamentos e histórico"
      />

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
        {profile ? (
          <>
            <div className="flex items-center gap-4">
              <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400 ring-1 ring-amber-400/20">
                <UserRound className="size-6" strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-zinc-50">
                  {profile.name}
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Cliente desde {profile.memberSince}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2 border-t border-zinc-800 pt-4">
              <ProfileRow icon={Phone} value={profile.phone} />
              <ProfileRow icon={Mail} value={profile.email} />
            </div>
          </>
        ) : (
          <div className="text-center">
            <p className="text-sm text-zinc-400">
              Nenhum cliente cadastrado na API ainda.
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Crie um usuário com role CUSTOMER via POST /users.
            </p>
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">
            Próximos Agendamentos
          </h2>
          <Link
            href="/agendar"
            className="text-xs font-medium text-amber-400 hover:text-amber-300"
          >
            Novo agendamento
          </Link>
        </div>

        <div className="space-y-3">
          {upcomingAppointments.map((appointment) => (
            <article
              key={appointment.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-zinc-100">
                    {appointment.service}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-400">
                    com {appointment.professional}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ${statusStyles[appointment.status]}`}
                >
                  {statusLabels[appointment.status]}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-400">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="size-3.5 text-amber-400" />
                  {appointment.date}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="size-3.5 text-amber-400" />
                  {appointment.time}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-800 px-3 py-2.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-700"
                >
                  <RefreshCw className="size-3.5" />
                  Remarcar
                </button>
                <button
                  type="button"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs font-medium text-red-400 transition hover:bg-red-500/15"
                >
                  <CalendarX2 className="size-3.5" />
                  Cancelar
                </button>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-3 text-xs text-zinc-500">
          Agendamentos ainda em mock local até o endpoint de appointments estar
          disponível.
        </p>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <History className="size-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-zinc-200">
            Histórico de cortes
          </h2>
        </div>

        <div className="space-y-3">
          {pastAppointments.map((appointment) => (
            <article
              key={appointment.id}
              className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
            >
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-zinc-400 ring-1 ring-zinc-800">
                <Scissors className="size-4" strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-medium text-zinc-100">
                  {appointment.service}
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {appointment.professional} · {appointment.date}
                </p>
              </div>
              <span className="text-sm font-semibold text-amber-400">
                {formatCurrency(appointment.price)}
              </span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

type ProfileRowProps = {
  icon: typeof Phone;
  value: string;
};

function ProfileRow({ icon: Icon, value }: ProfileRowProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-300">
      <Icon className="size-4 shrink-0 text-zinc-500" strokeWidth={2.2} />
      <span>{value}</span>
    </div>
  );
}
