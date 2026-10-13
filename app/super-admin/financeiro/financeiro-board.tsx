"use client";

import {
  BUSINESS_TYPE_LABELS,
  TENANT_STATUS_LABELS,
} from "@/lib/business-type";
import { formatCurrency } from "@/lib/mock-data";
import type { TenantLifecycleStatus } from "@/lib/tenant-types";
import {
  api,
  getErrorMessage,
  monthRangeIso,
  type ApiFinancialMetrics,
  type ApiFinancialOverview,
} from "@/services/api";
import {
  Building2,
  CircleDollarSign,
  Landmark,
  Percent,
  Scale,
  Store,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const STATUS_STYLE: Record<TenantLifecycleStatus, string> = {
  PENDING: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
  ACTIVE: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25",
  SUSPENDED: "bg-zinc-800 text-zinc-400 ring-zinc-700",
  PAST_DUE: "bg-red-400/10 text-red-300 ring-red-400/25",
};

const PAYMENT_LABELS: Record<string, string> = {
  CREDIT: "Crédito",
  DEBIT: "Débito",
  PIX: "PIX",
  CASH: "Dinheiro",
};

export function SuperAdminFinanceiroBoard() {
  const [overview, setOverview] = useState<ApiFinancialOverview | null>(null);
  const [metrics, setMetrics] = useState<ApiFinancialMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() =>
    startOfMonth(new Date()),
  );

  const period = useMemo(() => monthRangeIso(selectedMonth), [selectedMonth]);

  const load = useCallback(async () => {
    setError(null);
    const [data, snapshot] = await Promise.all([
      api.getSuperAdminFinancialOverview({
        from: period.from,
        to: period.to,
      }),
      api.getSuperAdminFinancialMetrics(),
    ]);
    setOverview(data);
    setMetrics(snapshot);
  }, [period.from, period.to]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(getErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [load]);

  const monthLabel = formatMonthLabel(selectedMonth);
  const maxVolume = Math.max(
    1,
    ...(overview?.partners.map((item) => item.grossVolume) ?? [1]),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Rede Clubby
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
            Financeiro consolidado
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Volume transacionado, mensalidades da plataforma e auditoria dos
            parceiros · {overview?.legalBasis ?? "Lei nº 13.352/2016"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setSelectedMonth(
                startOfMonth(
                  new Date(
                    selectedMonth.getFullYear(),
                    selectedMonth.getMonth() - 1,
                    1,
                  ),
                ),
              )
            }
            className="rounded-full border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300"
          >
            Mês anterior
          </button>
          <p className="min-w-[140px] text-center text-sm font-medium text-zinc-200">
            {monthLabel}
          </p>
          <button
            type="button"
            onClick={() =>
              setSelectedMonth(
                startOfMonth(
                  new Date(
                    selectedMonth.getFullYear(),
                    selectedMonth.getMonth() + 1,
                    1,
                  ),
                ),
              )
            }
            className="rounded-full border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300"
          >
            Próximo
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {loading && !overview && !metrics ? (
        <p className="text-sm text-zinc-500">Carregando consolidado...</p>
      ) : (
        <>
          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Snapshot 30 dias
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi
                label="Faturamento Clubby"
                value={metrics ? formatCurrency(metrics.platform.mrr) : "—"}
                hint={
                  metrics
                    ? `MRR · ARR ${formatCurrency(metrics.platform.arr)} · ${metrics.platform.billedTenants} ativos`
                    : "Mensalidades da plataforma"
                }
                icon={Building2}
              />
              <Kpi
                label="Volume de transações"
                value={
                  metrics
                    ? formatCurrency(metrics.network.transactionVolume)
                    : "—"
                }
                hint={
                  metrics
                    ? `${metrics.network.transactionCount} transações processadas`
                    : "GMV da rede"
                }
                icon={TrendingUp}
              />
              <Kpi
                label="Taxa de conversão"
                value={
                  metrics
                    ? formatRate(metrics.network.conversionRate)
                    : "—"
                }
                hint={
                  metrics
                    ? `${metrics.network.completedAppointmentsLast30Days}/${metrics.network.appointmentsLast30Days} atendimentos concluídos`
                    : "Agendamentos concluídos"
                }
                icon={Percent}
              />
              <Kpi
                label="Inadimplência"
                value={
                  metrics ? formatCurrency(metrics.platform.pastDueMrr) : "—"
                }
                hint={
                  metrics
                    ? `${metrics.platform.pastDueTenants} tenants · cobrança ${formatRate(metrics.platform.collectionRate)}`
                    : "MRR em atraso"
                }
                icon={Scale}
              />
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label="GMV da rede"
              value={
                overview ? formatCurrency(overview.network.grossVolume) : "—"
              }
              hint={
                overview
                  ? `${overview.network.transactionCount} transações · ${overview.network.completedAppointments} atendimentos`
                  : "Volume transacionado"
              }
              icon={CircleDollarSign}
            />
            <Kpi
              label="MRR da plataforma"
              value={overview ? formatCurrency(overview.platform.mrr) : "—"}
              hint={
                overview
                  ? `${overview.platform.billedTenants} matrizes ativas`
                  : "Assinaturas Clubby"
              }
              icon={Building2}
            />
            <Kpi
              label="Parte dos salões"
              value={
                overview ? formatCurrency(overview.network.salonShare) : "—"
              }
              hint={
                overview
                  ? `Repasse equipe ${formatCurrency(overview.network.professionalPayout)}`
                  : "Lei do Salão-Parceiro"
              }
              icon={Landmark}
            />
            <Kpi
              label="Pendências de repasse"
              value={
                overview ? formatCurrency(overview.network.pendingPayout) : "—"
              }
              hint="Auditoria de comissões em aberto"
              icon={Scale}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Store className="size-4 text-amber-300" />
                <h3 className="text-sm font-semibold text-zinc-100">
                  Auditoria dos parceiros
                </h3>
              </div>
              {!overview || overview.partners.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  Nenhum estabelecimento na rede.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-[11px] uppercase tracking-wide text-zinc-500">
                      <tr>
                        <th className="pb-3 font-medium">Parceiro</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">GMV</th>
                        <th className="pb-3 font-medium">Salão</th>
                        <th className="pb-3 font-medium">Equipe</th>
                        <th className="pb-3 font-medium">Pendente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.partners.map((partner) => (
                        <tr
                          key={partner.tenantId}
                          className="border-t border-zinc-800/70"
                        >
                          <td className="py-3">
                            <p className="font-medium text-zinc-100">
                              {partner.name}
                            </p>
                            <p className="text-[11px] text-zinc-500">
                              {partner.slug} ·{" "}
                              {BUSINESS_TYPE_LABELS[partner.businessType]}
                              {partner.city ? ` · ${partner.city}` : ""}
                            </p>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                              <div
                                className="h-full rounded-full bg-amber-300"
                                style={{
                                  width: `${Math.round((partner.grossVolume / maxVolume) * 100)}%`,
                                }}
                              />
                            </div>
                          </td>
                          <td className="py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${STATUS_STYLE[partner.status]}`}
                            >
                              {TENANT_STATUS_LABELS[partner.status]}
                            </span>
                          </td>
                          <td className="py-3 text-zinc-100">
                            {formatCurrency(partner.grossVolume)}
                          </td>
                          <td className="py-3 text-zinc-400">
                            {formatCurrency(partner.salonShare)}
                          </td>
                          <td className="py-3 text-zinc-400">
                            {formatCurrency(partner.professionalPayout)}
                          </td>
                          <td className="py-3 text-amber-300">
                            {formatCurrency(partner.pendingPayout)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Wallet className="size-4 text-amber-300" />
                  <h3 className="text-sm font-semibold text-zinc-100">
                    Mix de pagamentos
                  </h3>
                </div>
                {overview?.byPaymentMethod.length ? (
                  <ul className="space-y-3">
                    {overview.byPaymentMethod.map((row) => (
                      <li
                        key={row.paymentMethod ?? "none"}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-zinc-400">
                          {row.paymentMethod
                            ? PAYMENT_LABELS[row.paymentMethod] ??
                              row.paymentMethod
                            : "Não informado"}
                        </span>
                        <span className="font-medium text-zinc-100">
                          {formatCurrency(row.total)}
                          <span className="ml-2 text-xs text-zinc-500">
                            {row.count}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-500">
                    Sem transações no período.
                  </p>
                )}
              </div>
              <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-5">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Caixa líquido da rede
                </p>
                <p className="mt-2 text-2xl font-semibold text-zinc-50">
                  {overview ? formatCurrency(overview.network.netCash) : "—"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  ARR da plataforma{" "}
                  {overview ? formatCurrency(overview.platform.arr) : "—"}
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof CircleDollarSign;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </p>
        <Icon className="size-4 text-amber-300" strokeWidth={1.8} />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50">
        {value}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatRate(value: number) {
  return `${(value * 100).toFixed(1).replace(".", ",")}%`;
}

function formatMonthLabel(date: Date) {
  const label = date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return label.charAt(0).toUpperCase() + label.slice(1);
}
