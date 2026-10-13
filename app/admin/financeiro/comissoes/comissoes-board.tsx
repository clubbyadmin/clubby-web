"use client";

import { AdminNav } from "@/components/admin-nav";
import { ErrorState, LoadingState } from "@/components/api-state";
import { TenantBadge } from "@/components/tenant-brand";
import { useTenant } from "@/contexts/tenant-context";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/mock-data";
import {
  api,
  getErrorMessage,
  monthRangeIso,
  type ApiCashflow,
  type ApiCommission,
  type ApiCommissionProfessional,
  type ApiCommissionsOverview,
  type ApiTransactionPaymentMethod,
} from "@/services/api";
import {
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Landmark,
  Loader2,
  Plus,
  Scale,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const EMPTY_OVERVIEW: ApiCommissionsOverview = {
  tenantId: "",
  from: null,
  to: null,
  legalBasis: "Lei nº 13.352/2016",
  summary: {
    appointmentCount: 0,
    grossAmount: 0,
    salonShare: 0,
    netPayout: 0,
    pendingPayout: 0,
    paidPayout: 0,
  },
  byProfessional: [],
  items: [],
};

const EMPTY_CASHFLOW: ApiCashflow = {
  tenantId: "",
  from: null,
  to: null,
  totalIncome: 0,
  totalExpense: 0,
  netCash: 0,
  byCategory: [],
  entries: [],
};

const PAYMENT_LABELS: Record<ApiTransactionPaymentMethod, string> = {
  CREDIT: "Crédito",
  DEBIT: "Débito",
  PIX: "PIX",
  CASH: "Dinheiro",
};

export function ComissoesBoard() {
  const { tenant, loading: tenantLoading } = useTenant();
  const tenantId = tenant.id === "local" ? undefined : tenant.id;

  const [selectedMonth, setSelectedMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const [overview, setOverview] = useState<ApiCommissionsOverview>(EMPTY_OVERVIEW);
  const [cashflow, setCashflow] = useState<ApiCashflow>(EMPTY_CASHFLOW);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closingPeriod, setClosingPeriod] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [cashForm, setCashForm] = useState({
    description: "",
    amount: "",
    occurredAt: toDateInputValue(new Date()),
    paymentMethod: "CASH" as ApiTransactionPaymentMethod,
    type: "INCOME" as "INCOME" | "EXPENSE",
  });

  const period = useMemo(() => monthRangeIso(selectedMonth), [selectedMonth]);

  const loadData = useCallback(async () => {
    if (!tenantId) {
      return;
    }

    setError(null);
    const [commissions, ledger] = await Promise.all([
      api.getCommissions({
        tenantId,
        from: period.from,
        to: period.to,
      }),
      api.getCashflow({
        tenantId,
        from: period.from,
        to: period.to,
      }),
    ]);
    setOverview(commissions);
    setCashflow(ledger);
  }, [period.from, period.to, tenantId]);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    loadData()
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
  }, [loadData, tenantId]);

  const pendingItems = overview.items.filter((item) => item.status === "PENDING");
  const monthLabel = formatMonthLabel(selectedMonth);
  const hasLoaded = overview.tenantId !== "";

  async function handleCloseAndPay() {
    if (!tenantId) {
      return;
    }

    setClosingPeriod(true);
    setError(null);

    try {
      await api.processSettlements({
        tenantId,
        from: period.from,
        to: period.to,
        markAsPaid: true,
      });
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setClosingPeriod(false);
    }
  }

  async function handlePayCommission(item: ApiCommission) {
    setPayingId(item.id);
    setError(null);

    try {
      await api.updateCommission(item.id, { status: "PAID" });
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setPayingId(null);
    }
  }

  async function handleCreateCashEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tenantId) {
      setFormError("Tenant indisponível. Recarregue o painel e tente novamente.");
      return;
    }

    const amount = Number(cashForm.amount.replace(",", "."));

    if (!cashForm.description.trim()) {
      setFormError("Informe a descrição do lançamento.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Informe um valor maior que zero.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await api.createTransaction({
        tenantId,
        type: cashForm.type,
        description: cashForm.description.trim(),
        amount,
        occurredAt: dateInputToIso(cashForm.occurredAt),
        paymentMethod: cashForm.paymentMethod,
        status: "CONFIRMED",
      });
      setCashModalOpen(false);
      setCashForm({
        description: "",
        amount: "",
        occurredAt: toDateInputValue(new Date()),
        paymentMethod: "CASH",
        type: "INCOME",
      });
      await loadData();
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex flex-1 flex-col px-4 pb-4 pt-6 sm:px-6 lg:px-10 xl:px-12">
      <header className="mb-4 flex flex-col gap-4 lg:mb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <TenantBadge />
          <p className="mt-3 text-sm text-zinc-400">
            Fechamento de caixa e comissões · {tenant.name}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{overview.legalBasis}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/admin/financeiro"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-100"
          >
            <Landmark className="size-4" />
            DRE e fluxo
          </Link>
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setCashForm({
                description: "",
                amount: "",
                occurredAt: toDateInputValue(new Date()),
                paymentMethod: "CASH",
                type: "INCOME",
              });
              setCashModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-100"
          >
            <Plus className="size-4" />
            Lançar no caixa
          </button>
          <button
            type="button"
            onClick={() => void handleCloseAndPay()}
            disabled={closingPeriod || !tenantId}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-[color-mix(in_srgb,var(--accent)_20%,transparent)] disabled:opacity-50"
          >
            {closingPeriod ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Scale className="size-4" />
            )}
            Fechar e pagar o mês
          </button>
        </div>
      </header>

      <AdminNav className="mb-4 lg:hidden" />

      <section className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
          <button
            type="button"
            onClick={() =>
              setSelectedMonth(
                startOfMonth(
                  new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1),
                ),
              )
            }
            className="inline-flex size-10 items-center justify-center rounded-xl border border-zinc-800 text-zinc-300 hover:border-zinc-700"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Competência
            </p>
            <p className="text-sm font-semibold text-zinc-100">{monthLabel}</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setSelectedMonth(
                startOfMonth(
                  new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1),
                ),
              )
            }
            className="inline-flex size-10 items-center justify-center rounded-xl border border-zinc-800 text-zinc-300 hover:border-zinc-700"
            aria-label="Próximo mês"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setSelectedMonth(startOfMonth(new Date()))}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm font-medium text-zinc-200 hover:border-zinc-700"
        >
          Mês atual
        </button>
      </section>

      {tenantLoading || (loading && !hasLoaded) ? (
        <LoadingState message="Carregando comissões e caixa..." />
      ) : !tenantId ? (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-6 text-center text-sm text-zinc-400">
          Não foi possível identificar o estabelecimento.
        </p>
      ) : error && !hasLoaded ? (
        <ErrorState message={error} onRetry={() => void loadData()} />
      ) : (
        <>
          {error ? (
            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label="Caixa do período"
              value={formatCurrency(cashflow.totalIncome)}
              hint={`Saídas ${formatCurrency(cashflow.totalExpense)}`}
              icon={CircleDollarSign}
            />
            <Kpi
              label="Parte do salão"
              value={formatCurrency(overview.summary.salonShare)}
              hint={`${overview.summary.appointmentCount} atendimentos`}
              icon={Landmark}
            />
            <Kpi
              label="A pagar à equipe"
              value={formatCurrency(overview.summary.pendingPayout)}
              hint="Comissões pendentes"
              icon={Wallet}
            />
            <Kpi
              label="Já pago"
              value={formatCurrency(overview.summary.paidPayout)}
              hint={`Líquido ${formatCurrency(overview.summary.netPayout)}`}
              icon={CheckCircle2}
            />
          </section>

          <section className="mb-6 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center gap-2 border-b border-zinc-800 px-5 py-4">
              <Users className="size-4 text-[var(--accent)]" />
              <h2 className="text-sm font-semibold text-zinc-100">
                Repasses por profissional
              </h2>
            </div>
            {overview.byProfessional.length === 0 ? (
              <p className="px-5 py-8 text-sm text-zinc-500">
                Nenhum atendimento concluído no período para calcular comissões.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Profissional</th>
                      <th className="px-5 py-3 font-medium">Cota-parte</th>
                      <th className="px-5 py-3 font-medium">Bruto</th>
                      <th className="px-5 py-3 font-medium">Salão</th>
                      <th className="px-5 py-3 font-medium">Líquido</th>
                      <th className="px-5 py-3 font-medium">Pendente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.byProfessional.map((row) => (
                      <ProfessionalRow key={row.professionalId} row={row} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center gap-2 border-b border-zinc-800 px-5 py-4">
              <Banknote className="size-4 text-[var(--accent)]" />
              <h2 className="text-sm font-semibold text-zinc-100">
                Extrato de comissões pendentes
              </h2>
            </div>
            {pendingItems.length === 0 ? (
              <p className="px-5 py-8 text-sm text-zinc-500">
                Não há repasses pendentes neste mês.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-800">
                {pendingItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-100">
                        {item.professional.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {item.client?.name ?? "Cliente"} ·{" "}
                        {formatShortDate(item.appointment.startTime)} · bruto{" "}
                        {formatCurrency(item.grossAmount)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold text-zinc-50">
                        {formatCurrency(item.netPayout)}
                      </p>
                      <button
                        type="button"
                        onClick={() => void handlePayCommission(item)}
                        disabled={payingId === item.id}
                        className="rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/20 disabled:opacity-60"
                      >
                        {payingId === item.id ? "Pagando..." : "Marcar pago"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {cashModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <form
            onSubmit={(event) => void handleCreateCashEntry(event)}
            className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-50">
                Lançamento de caixa
              </h3>
              <button
                type="button"
                onClick={() => setCashModalOpen(false)}
                className="rounded-full p-1 text-zinc-500 hover:text-zinc-200"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-3">
              <label className="block text-xs text-zinc-400">
                Descrição
                <input
                  required
                  value={cashForm.description}
                  onChange={(event) =>
                    setCashForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100"
                />
              </label>
              <label className="block text-xs text-zinc-400">
                Valor
                <input
                  required
                  inputMode="decimal"
                  value={cashForm.amount}
                  onChange={(event) =>
                    setCashForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100"
                />
              </label>
              <label className="block text-xs text-zinc-400">
                Data
                <input
                  type="date"
                  required
                  value={cashForm.occurredAt}
                  onChange={(event) =>
                    setCashForm((current) => ({
                      ...current,
                      occurredAt: event.target.value,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100"
                />
              </label>
              <label className="block text-xs text-zinc-400">
                Tipo
                <select
                  value={cashForm.type}
                  onChange={(event) =>
                    setCashForm((current) => ({
                      ...current,
                      type: event.target.value as "INCOME" | "EXPENSE",
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100"
                >
                  <option value="INCOME">Entrada</option>
                  <option value="EXPENSE">Saída</option>
                </select>
              </label>
              <label className="block text-xs text-zinc-400">
                Forma de pagamento
                <select
                  value={cashForm.paymentMethod}
                  onChange={(event) =>
                    setCashForm((current) => ({
                      ...current,
                      paymentMethod: event.target
                        .value as ApiTransactionPaymentMethod,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100"
                >
                  {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {formError ? (
              <p className="mt-3 text-sm text-red-300">{formError}</p>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="mt-4 w-full rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-60"
            >
              {submitting ? "Salvando..." : "Confirmar lançamento"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function ProfessionalRow({ row }: { row: ApiCommissionProfessional }) {
  return (
    <tr className="border-t border-zinc-800/80">
      <td className="px-5 py-3 text-zinc-100">{row.professionalName}</td>
      <td className="px-5 py-3 text-zinc-400">
        {Math.round(row.commissionRate * 100)}%
      </td>
      <td className="px-5 py-3 text-zinc-200">
        {formatCurrency(row.grossAmount)}
      </td>
      <td className="px-5 py-3 text-zinc-400">
        {formatCurrency(row.salonShare)}
      </td>
      <td className="px-5 py-3 font-medium text-zinc-50">
        {formatCurrency(row.netPayout)}
      </td>
      <td
        className={cn(
          "px-5 py-3",
          row.pendingPayout > 0 ? "text-amber-300" : "text-zinc-500",
        )}
      >
        {formatCurrency(row.pendingPayout)}
      </td>
    </tr>
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
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </p>
        <Icon className="size-4 text-[var(--accent)]" strokeWidth={1.8} />
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

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateInputToIso(value: string) {
  return new Date(`${value}T12:00:00`).toISOString();
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function formatMonthLabel(date: Date) {
  const label = date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return label.charAt(0).toUpperCase() + label.slice(1);
}
