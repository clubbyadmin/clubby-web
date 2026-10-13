"use client";

import { AdminNav } from "@/components/admin-nav";
import { ErrorState, LoadingState } from "@/components/api-state";
import { AccentIconWrap } from "@/components/shell/accent-ui";
import { TenantBadge } from "@/components/tenant-brand";
import { useAdminSession } from "@/contexts/admin-session-context";
import { useTenant } from "@/contexts/tenant-context";
import { firstNameFrom } from "@/lib/admin-rbac";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/mock-data";
import {
  formatDisplayDate,
  minutesToLabel,
  statusLabels,
  statusStyles,
  type ScheduleAppointment,
} from "@/lib/schedule-data";
import {
  api,
  dayRangeIso,
  getErrorMessage,
  mapApiAppointmentToSchedule,
  monthRangeIso,
  type ApiSettlement,
} from "@/services/api";
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Loader2,
  Scissors,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type MeuPainelBoardProps = {
  section: "agenda" | "comissoes";
};

export function MeuPainelBoard({ section }: MeuPainelBoardProps) {
  const { tenant, loading: tenantLoading } = useTenant();
  const { user } = useAdminSession();
  const tenantId = tenant.id === "local" ? undefined : tenant.id;
  const professionalId = user?.role === "PROFESSIONAL" ? user.id : undefined;

  return (
    <div className="relative flex flex-1 flex-col px-4 pb-4 pt-6 sm:px-6 lg:px-10 xl:px-12">
      <header className="mb-4">
        <TenantBadge />
        <p className="mt-3 text-sm text-zinc-400">
          {section === "agenda"
            ? `Olá, ${firstNameFrom(user?.name ?? "profissional")} · sua agenda`
            : `Extrato pessoal · ${firstNameFrom(user?.name ?? "profissional")}`}
        </p>
      </header>

      <AdminNav className="mb-4 lg:hidden" />

      {tenantLoading ? (
        <LoadingState message="Carregando seu painel..." />
      ) : !tenantId || !professionalId ? (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-6 text-center text-sm text-zinc-400">
          Esta tela é exclusiva do profissional logado. Entre com o perfil de
          barbeiro para ver agenda e comissões pessoais.
        </p>
      ) : section === "agenda" ? (
        <ProfessionalAgenda
          tenantId={tenantId}
          professionalId={professionalId}
        />
      ) : (
        <ProfessionalCommissions
          tenantId={tenantId}
          professionalId={professionalId}
        />
      )}
    </div>
  );
}

function ProfessionalAgenda({
  tenantId,
  professionalId,
}: {
  tenantId: string;
  professionalId: string;
}) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [appointments, setAppointments] = useState<ScheduleAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const range = dayRangeIso(selectedDate);
      const response = await api.getAppointments({
        tenantId,
        professionalId,
        from: range.from,
        to: range.to,
      });
      setAppointments(
        response
          .map(mapApiAppointmentToSchedule)
          .sort((a, b) => a.startMinutes - b.startMinutes),
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [professionalId, selectedDate, tenantId]);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  const openAppointments = useMemo(
    () => appointments.filter((item) => item.status !== "CANCELLED"),
    [appointments],
  );
  const nextAppointment = openAppointments.find(
    (item) => item.status === "CONFIRMED" || item.status === "PENDING",
  );

  async function handleComplete(appointmentId: string) {
    setUpdatingId(appointmentId);
    setError(null);

    try {
      await api.updateAppointment(appointmentId, { status: "COMPLETED" });
      await loadAppointments();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setUpdatingId(null);
    }
  }

  function shiftDate(days: number) {
    setSelectedDate((current) => {
      const next = new Date(current);
      next.setDate(current.getDate() + days);
      return next;
    });
  }

  return (
    <>
      <section className="mb-4 grid grid-cols-2 gap-3">
        <SummaryCard
          icon={Scissors}
          label="Atendimentos"
          value={String(openAppointments.length)}
          hint="Na data selecionada"
        />
        <SummaryCard
          icon={Clock3}
          label="Próximo"
          value={
            nextAppointment
              ? minutesToLabel(nextAppointment.startMinutes)
              : "—"
          }
          hint={nextAppointment?.customerName ?? "Sem horário aberto"}
        />
      </section>

      <div className="mb-4 flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
        <button
          type="button"
          onClick={() => shiftDate(-1)}
          className="inline-flex size-12 items-center justify-center rounded-xl border border-zinc-800 text-zinc-300 hover:border-zinc-700"
          aria-label="Dia anterior"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="px-2 text-center">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Minha agenda
          </p>
          <p className="text-sm font-semibold capitalize text-zinc-100">
            {formatDisplayDate(selectedDate)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => shiftDate(1)}
          className="inline-flex size-12 items-center justify-center rounded-xl border border-zinc-800 text-zinc-300 hover:border-zinc-700"
          aria-label="Próximo dia"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setSelectedDate(new Date())}
        className="mb-4 w-full rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm font-medium text-zinc-200 hover:border-zinc-700"
      >
        Hoje
      </button>

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <LoadingState message="Carregando seus horários..." />
      ) : error && openAppointments.length === 0 ? (
        <ErrorState message={error} onRetry={() => void loadAppointments()} />
      ) : openAppointments.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-10 text-center text-sm text-zinc-500">
          Nenhum agendamento neste dia. Aproveite para respirar — ou confira o
          dia seguinte.
        </p>
      ) : (
        <ul className="space-y-3">
          {openAppointments.map((appointment) => (
            <li
              key={appointment.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-semibold tabular-nums text-zinc-100">
                    {minutesToLabel(appointment.startMinutes)}
                  </p>
                  <p className="mt-1 truncate text-base font-medium text-zinc-100">
                    {appointment.customerName}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {appointment.serviceName} · {appointment.durationMinutes} min
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ring-1",
                    statusStyles[appointment.status],
                  )}
                >
                  {statusLabels[appointment.status]}
                </span>
              </div>
              {appointment.status === "CONFIRMED" ||
              appointment.status === "PENDING" ? (
                <button
                  type="button"
                  disabled={updatingId === appointment.id}
                  onClick={() => void handleComplete(appointment.id)}
                  className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 text-sm font-semibold text-zinc-950 disabled:opacity-60"
                >
                  {updatingId === appointment.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  Concluir atendimento
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ProfessionalCommissions({
  tenantId,
  professionalId,
}: {
  tenantId: string;
  professionalId: string;
}) {
  const [selectedMonth, setSelectedMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const [settlements, setSettlements] = useState<ApiSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const period = useMemo(() => monthRangeIso(selectedMonth), [selectedMonth]);

  const loadSettlements = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.getSettlements({
        tenantId,
        professionalId,
        from: period.from,
        to: period.to,
      });
      setSettlements(response);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setSettlements([]);
    } finally {
      setLoading(false);
    }
  }, [period.from, period.to, professionalId, tenantId]);

  useEffect(() => {
    void loadSettlements();
  }, [loadSettlements]);

  const pendingTotal = settlements
    .filter((item) => item.status === "PENDING")
    .reduce((sum, item) => sum + Number(item.professionalShare), 0);
  const paidTotal = settlements
    .filter((item) => item.status === "PAID")
    .reduce((sum, item) => sum + Number(item.professionalShare), 0);
  const appointmentCount = settlements.reduce(
    (sum, item) => sum + item.appointmentCount,
    0,
  );

  function shiftMonth(delta: number) {
    setSelectedMonth((current) => {
      const next = new Date(current);
      next.setMonth(current.getMonth() + delta);
      return startOfMonth(next);
    });
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="inline-flex size-12 items-center justify-center rounded-xl border border-zinc-800 text-zinc-300 hover:border-zinc-700"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="px-2 text-center">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Competência
          </p>
          <p className="text-sm font-semibold capitalize text-zinc-100">
            {formatMonthLabel(selectedMonth)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="inline-flex size-12 items-center justify-center rounded-xl border border-zinc-800 text-zinc-300 hover:border-zinc-700"
          aria-label="Próximo mês"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={Wallet}
          label="A receber"
          value={formatCurrency(pendingTotal)}
          hint="Repasses pendentes"
        />
        <SummaryCard
          icon={CircleDollarSign}
          label="Já pago"
          value={formatCurrency(paidTotal)}
          hint="Creditado neste mês"
        />
        <SummaryCard
          icon={CalendarClock}
          label="Atendimentos"
          value={String(appointmentCount)}
          hint="No fechamento do período"
        />
      </section>

      <p className="mb-4 rounded-2xl border border-[color-mix(in_srgb,var(--accent)_20%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] px-4 py-3 text-sm text-zinc-300">
        Extrato pessoal da Lei do Salão-Parceiro. Aqui só entram os seus
        atendimentos — sem DRE, despesas do salão ou números dos colegas.
      </p>

      {loading ? (
        <LoadingState message="Carregando seu extrato..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void loadSettlements()} />
      ) : settlements.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-10 text-center text-sm text-zinc-500">
          Nenhum fechamento neste mês ainda. Assim que a gestão processar os
          repasses, eles aparecem aqui.
        </p>
      ) : (
        <ul className="space-y-3">
          {settlements.map((settlement) => {
            const sharePct = Math.round(Number(settlement.partnerShareRate) * 100);
            const paid = settlement.status === "PAID";

            return (
              <li
                key={settlement.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      {formatPeriod(settlement.periodStart, settlement.periodEnd)}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-zinc-100">
                      {formatCurrency(Number(settlement.professionalShare))}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      Sua cota ({sharePct}%) · {settlement.appointmentCount}{" "}
                      atendimento
                      {settlement.appointmentCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ring-1",
                      paid
                        ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
                        : "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]",
                    )}
                  >
                    {paid ? "Pago" : "A receber"}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-zinc-950/60 px-3 py-2">
                    <dt className="text-[11px] text-zinc-500">Produção bruta</dt>
                    <dd className="font-medium text-zinc-200">
                      {formatCurrency(Number(settlement.grossRevenue))}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-zinc-950/60 px-3 py-2">
                    <dt className="text-[11px] text-zinc-500">Cota do salão</dt>
                    <dd className="font-medium text-zinc-200">
                      {formatCurrency(Number(settlement.salonShare))}
                    </dd>
                  </div>
                </dl>
                {paid && settlement.paidAt ? (
                  <p className="mt-3 text-xs text-zinc-500">
                    Pago em {formatPaidAt(settlement.paidAt)}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
      <div className="mb-3 flex items-center gap-2">
        <AccentIconWrap className="size-9">
          <Icon className="size-4" strokeWidth={2.2} />
        </AccentIconWrap>
        <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      </div>
      <p className="text-xl font-semibold text-zinc-100">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
    </article>
  );
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function formatPeriod(from: string, to: string) {
  const start = new Date(from);
  const end = new Date(to);
  return `${start.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} — ${end.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`;
}

function formatPaidAt(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
