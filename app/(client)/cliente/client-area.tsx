"use client";

import { ClientAreaNav } from "@/components/client-area-nav";
import { ErrorState, LoadingState } from "@/components/api-state";
import { AccentIconWrap } from "@/components/shell/accent-ui";
import { PageHeader } from "@/components/page-header";
import { useTenant } from "@/contexts/tenant-context";
import { formatCurrency } from "@/lib/mock-data";
import {
  api,
  getErrorMessage,
  mapApiAppointmentToClientView,
  type ApiCustomerProfile,
  type ApiSubscriptionMember,
  type ClientAppointmentView,
} from "@/services/api";
import {
  CalendarClock,
  ChevronRight,
  Crown,
  History,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

export function ClientArea() {
  const { tenant } = useTenant();
  const tenantId = tenant.id === "local" ? undefined : tenant.id;
  const [profile, setProfile] = useState<ApiCustomerProfile | null>(null);
  const [member, setMember] = useState<ApiSubscriptionMember | null>(null);
  const [appointments, setAppointments] = useState<ClientAppointmentView[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClientData = useCallback(async () => {
    if (!tenantId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const customer = await api.getCustomerProfile({ tenantId });
      setProfile(customer);

      const [members, response] = await Promise.all([
        api.getSubscriptionMembers({
          tenantId,
          customerId: customer.user.id,
          status: "ACTIVE",
        }),
        api.getAppointments({
          tenantId,
          clientId: customer.user.id,
        }),
      ]);

      setMember(members[0] ?? null);
      setAppointments(response.map(mapApiAppointmentToClientView));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadClientData();
  }, [loadClientData]);

  const nextAppointment = useMemo(() => {
    const now = Date.now();
    return appointments
      .filter(
        (item) =>
          item.status !== "CANCELLED" &&
          item.status !== "COMPLETED" &&
          item.status !== "NO_SHOW" &&
          new Date(item.startTime).getTime() >= now,
      )
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      )[0];
  }, [appointments]);

  if (loading) {
    return (
      <div className="relative flex flex-1 flex-col px-5 pb-8 pt-8">
        <PageHeader
          title="Área do Cliente"
          subtitle="Clube, agenda e perfil"
        />
        <LoadingState message="Carregando sua área..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex flex-1 flex-col px-5 pb-8 pt-8">
        <PageHeader
          title="Área do Cliente"
          subtitle="Clube, agenda e perfil"
        />
        <ErrorState message={error} onRetry={() => void loadClientData()} />
      </div>
    );
  }

  const user = profile?.user;
  const avatar = profile?.client.avatarUrl;

  return (
    <div className="relative flex flex-1 flex-col px-5 pb-8 pt-8">
      <PageHeader
        title="Área do Cliente"
        subtitle={`${tenant.name} · clube e agendamentos`}
      />
      <ClientAreaNav />

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
        {user ? (
          <div className="flex items-center gap-4">
            {avatar ? (
              <img
                src={avatar}
                alt={user.name}
                className="size-14 rounded-2xl object-cover ring-1 ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]"
              />
            ) : (
              <AccentIconWrap className="size-14">
                <UserRound className="size-6" strokeWidth={2.2} />
              </AccentIconWrap>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold text-zinc-50">
                {user.name}
              </h2>
              <p className="mt-1 text-xs text-zinc-400">
                {user.email ?? "Sem e-mail de acesso"}
              </p>
            </div>
            <Link
              href="/cliente/perfil"
              className="text-xs font-semibold text-[var(--accent)]"
            >
              Editar
            </Link>
          </div>
        ) : (
          <p className="text-center text-sm text-zinc-400">
            Nenhum cliente cadastrado ainda.
          </p>
        )}
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <HubCard
          href="/cliente/plano"
          icon={Crown}
          title="Meu plano"
          description={
            member
              ? `${member.plan.name} · ${formatCurrency(Number(member.plan.price))}`
              : "Assine o clube e libere benefícios"
          }
        />
        <HubCard
          href="/cliente/agendamentos"
          icon={CalendarClock}
          title="Agenda"
          description={
            nextAppointment
              ? `${nextAppointment.date} · ${nextAppointment.time}`
              : "Nenhum horário marcado"
          }
        />
      </section>

      {nextAppointment ? (
        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="size-4 text-[var(--accent)]" />
            <h2 className="text-sm font-semibold text-zinc-200">
              Próximo horário
            </h2>
          </div>
          <p className="font-medium text-zinc-100">{nextAppointment.service}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {nextAppointment.professional} · {nextAppointment.date} ·{" "}
            {nextAppointment.time}
          </p>
          <Link
            href="/cliente/agendamentos"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]"
          >
            Ver agendamentos
            <ChevronRight className="size-3.5" />
          </Link>
        </section>
      ) : (
        <Link
          href="/agendar"
          className="mt-5 inline-flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950"
        >
          Agendar agora
        </Link>
      )}

      <Link
        href="/cliente/agendamentos"
        className="mt-4 inline-flex items-center gap-2 text-xs text-zinc-500"
      >
        <History className="size-3.5" />
        Histórico de cortes e faltas
      </Link>
    </div>
  );
}

function HubCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Crown;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-32 flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 active:scale-[0.98]"
    >
      <AccentIconWrap className="size-10">
        <Icon className="size-4" strokeWidth={2.2} />
      </AccentIconWrap>
      <span>
        <span className="block text-sm font-semibold text-zinc-100">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
          {description}
        </span>
      </span>
    </Link>
  );
}
