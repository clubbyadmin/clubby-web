"use client";

import { AdminNav } from "@/components/admin-nav";
import { ErrorState, LoadingState } from "@/components/api-state";
import { AccentIconWrap } from "@/components/shell/accent-ui";
import { TenantBadge } from "@/components/tenant-brand";
import { useTenant } from "@/contexts/tenant-context";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/mock-data";
import {
  api,
  getErrorMessage,
  monthRangeIso,
  type ApiCashflow,
  type ApiCashflowEntry,
  type ApiDre,
  type ApiExpense,
  type ApiExpenseCategory,
  type ApiExpenseStatus,
  type ApiSettlement,
  type ApiTransactionCategory,
} from "@/services/api";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Landmark,
  Loader2,
  Plus,
  Receipt,
  Repeat,
  Scale,
  ScrollText,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

const EMPTY_DRE: ApiDre = {
  tenantId: "",
  from: null,
  to: null,
  legalBasis: "Lei nº 13.352/2016",
  grossRevenue: 0,
  completedAppointments: 0,
  salonShare: 0,
  professionalShare: 0,
  operatingExpenses: 0,
  netProfit: 0,
  byProfessional: [],
  accountsPayable: {
    operatingExpenses: 0,
    professionalSettlements: 0,
    total: 0,
  },
  accountsReceivable: {
    pendingAppointments: 0,
    total: 0,
  },
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

const CATEGORY_LABELS: Record<ApiExpenseCategory, string> = {
  ALUGUEL: "Aluguel",
  AGUA: "Água",
  ENERGIA: "Energia",
  FORNECEDOR: "Fornecedor",
  OUTROS: "Outros",
};

const CASHFLOW_CATEGORY_LABELS: Record<ApiTransactionCategory, string> = {
  SERVICE_REVENUE: "Receita de serviços",
  SUBSCRIPTION_REVENUE: "Assinaturas",
  PROFESSIONAL_PAYOUT: "Repasse a profissionais",
  OPERATING_EXPENSE: "Despesa operacional",
  OTHER: "Lançamento avulso",
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as Array<
  [ApiExpenseCategory, string]
>;

type FinanceTab = "dre" | "repasses" | "contas";
type ExpenseStatusFilter = "ALL" | ApiExpenseStatus;
type SettlementFilter = "ALL" | "PENDING" | "PAID";

type ExpenseFormState = {
  description: string;
  category: ApiExpenseCategory;
  amount: string;
  dueDate: string;
  alreadyPaid: boolean;
};

type IncomeFormState = {
  description: string;
  amount: string;
  occurredAt: string;
};

const INITIAL_EXPENSE_FORM: ExpenseFormState = {
  description: "",
  category: "ALUGUEL",
  amount: "",
  dueDate: toDateInputValue(new Date()),
  alreadyPaid: false,
};

const INITIAL_INCOME_FORM: IncomeFormState = {
  description: "",
  amount: "",
  occurredAt: toDateInputValue(new Date()),
};

const TABS: { id: FinanceTab; label: string }[] = [
  { id: "dre", label: "Fluxo de caixa & DRE" },
  { id: "repasses", label: "Repasses" },
  { id: "contas", label: "Contas a pagar / receber" },
];

export function FinanceiroBoard() {
  const { tenant, loading: tenantLoading } = useTenant();
  const tenantId = tenant.id === "local" ? undefined : tenant.id;

  const [tab, setTab] = useState<FinanceTab>("dre");
  const [selectedMonth, setSelectedMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const [dre, setDre] = useState<ApiDre>(EMPTY_DRE);
  const [cashflow, setCashflow] = useState<ApiCashflow>(EMPTY_CASHFLOW);
  const [settlements, setSettlements] = useState<ApiSettlement[]>([]);
  const [expenses, setExpenses] = useState<ApiExpense[]>([]);
  const [expenseFilter, setExpenseFilter] = useState<ExpenseStatusFilter>("ALL");
  const [settlementFilter, setSettlementFilter] =
    useState<SettlementFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>(
    INITIAL_EXPENSE_FORM,
  );
  const [incomeForm, setIncomeForm] = useState<IncomeFormState>(
    INITIAL_INCOME_FORM,
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [closingPeriod, setClosingPeriod] = useState(false);

  const period = useMemo(() => monthRangeIso(selectedMonth), [selectedMonth]);

  const loadFinancialData = useCallback(async () => {
    if (!tenantId) {
      setDre(EMPTY_DRE);
      setCashflow(EMPTY_CASHFLOW);
      setSettlements([]);
      setExpenses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [dreResponse, cashflowResponse, settlementsResponse, expensesResponse] =
        await Promise.all([
          api.getDre({ tenantId, from: period.from, to: period.to }),
          api.getCashflow({ tenantId, from: period.from, to: period.to }),
          api.getSettlements({ tenantId, from: period.from, to: period.to }),
          api.getExpenses({ tenantId, from: period.from, to: period.to }),
        ]);

      setDre(dreResponse);
      setCashflow(cashflowResponse);
      setSettlements(settlementsResponse);
      setExpenses(expensesResponse);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setDre(EMPTY_DRE);
      setCashflow(EMPTY_CASHFLOW);
      setSettlements([]);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [period.from, period.to, tenantId]);

  useEffect(() => {
    void loadFinancialData();
  }, [loadFinancialData]);

  const visibleExpenses = useMemo(() => {
    if (expenseFilter === "ALL") {
      return expenses;
    }
    return expenses.filter((expense) => expense.status === expenseFilter);
  }, [expenseFilter, expenses]);

  const visibleSettlements = useMemo(() => {
    if (settlementFilter === "ALL") {
      return settlements;
    }
    return settlements.filter((item) => item.status === settlementFilter);
  }, [settlementFilter, settlements]);

  const incomeEntries = useMemo(
    () => cashflow.entries.filter((entry) => entry.type === "INCOME"),
    [cashflow.entries],
  );

  function shiftMonth(offset: number) {
    setSelectedMonth((current) => {
      const next = new Date(current);
      next.setMonth(current.getMonth() + offset);
      return startOfMonth(next);
    });
  }

  async function handleCreateExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tenantId) {
      setFormError("Tenant indisponível. Recarregue o painel e tente novamente.");
      return;
    }

    const amount = Number(expenseForm.amount.replace(",", "."));

    if (!expenseForm.description.trim()) {
      setFormError("Informe a descrição da conta.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Informe um valor maior que zero.");
      return;
    }

    if (!expenseForm.dueDate) {
      setFormError("Informe a data de vencimento.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await api.createExpense({
        tenantId,
        description: expenseForm.description.trim(),
        category: expenseForm.category,
        amount,
        dueDate: dateInputToIso(expenseForm.dueDate),
        status: expenseForm.alreadyPaid ? "PAID" : "PENDING",
      });

      setExpenseModalOpen(false);
      setExpenseForm({
        ...INITIAL_EXPENSE_FORM,
        dueDate: toDateInputValue(new Date()),
      });
      await loadFinancialData();
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateIncome(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tenantId) {
      setFormError("Tenant indisponível. Recarregue o painel e tente novamente.");
      return;
    }

    const amount = Number(incomeForm.amount.replace(",", "."));

    if (!incomeForm.description.trim()) {
      setFormError("Informe a descrição da receita.");
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
        type: "INCOME",
        category: "OTHER",
        description: incomeForm.description.trim(),
        amount,
        occurredAt: dateInputToIso(incomeForm.occurredAt),
      });

      setIncomeModalOpen(false);
      setIncomeForm({
        ...INITIAL_INCOME_FORM,
        occurredAt: toDateInputValue(new Date()),
      });
      await loadFinancialData();
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkExpensePaid(expenseId: string) {
    setPayingId(expenseId);
    setError(null);

    try {
      await api.updateExpense(expenseId, { status: "PAID" });
      await loadFinancialData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setPayingId(null);
    }
  }

  async function handleMarkSettlementPaid(settlement: ApiSettlement) {
    setPayingId(settlement.id);
    setError(null);

    try {
      await api.updateSettlement(settlement.id, { status: "PAID" });
      await loadFinancialData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setPayingId(null);
    }
  }

  async function handleClosePeriod() {
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
      });
      await loadFinancialData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setClosingPeriod(false);
    }
  }

  const monthLabel = formatMonthLabel(selectedMonth);
  const hasLoaded = dre.tenantId !== "" || expenses.length > 0 || cashflow.entries.length > 0;

  return (
    <div className="relative flex flex-1 flex-col px-4 pb-4 pt-6 sm:px-6 lg:px-10 xl:px-12">
      <header className="mb-4 flex flex-col gap-4 lg:mb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <TenantBadge />
          <p className="mt-3 text-sm text-zinc-400">
            Financeiro e repasses · {tenant.name}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          {tab === "repasses" ? (
            <button
              type="button"
              onClick={() => void handleClosePeriod()}
              disabled={closingPeriod || !tenantId}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-[color-mix(in_srgb,var(--accent)_20%,transparent)] disabled:opacity-50"
            >
              {closingPeriod ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Scale className="size-4" />
              )}
              Fechar repasses do mês
            </button>
          ) : null}

          {tab === "contas" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setIncomeForm({
                    ...INITIAL_INCOME_FORM,
                    occurredAt: toDateInputValue(new Date()),
                  });
                  setIncomeModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-100"
              >
                <ArrowDownLeft className="size-4 text-emerald-400" />
                Lançar receita
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setExpenseForm({
                    ...INITIAL_EXPENSE_FORM,
                    dueDate: toDateInputValue(new Date()),
                  });
                  setExpenseModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
              >
                <Plus className="size-4" />
                Adicionar despesa
              </button>
            </>
          ) : null}
        </div>
      </header>

      <AdminNav className="mb-4 lg:hidden" />

      <section className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
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
            onClick={() => shiftMonth(1)}
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

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition",
              tab === item.id
                ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]"
                : "bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200",
            )}
          >
            {item.label}
          </button>
        ))}
        <Link
          href="/admin/financeiro/comissoes"
          className="shrink-0 rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200"
        >
          Fechamento e comissões
        </Link>
      </div>

      {tenantLoading || (loading && !hasLoaded) ? (
        <LoadingState message="Carregando DRE e fluxo de caixa..." />
      ) : !tenantId ? (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-6 text-center text-sm text-zinc-400">
          Não foi possível identificar o estabelecimento. Recarregue o painel
          para carregar o financeiro.
        </p>
      ) : error && !hasLoaded ? (
        <ErrorState message={error} onRetry={() => void loadFinancialData()} />
      ) : (
        <>
          {error ? (
            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
              <button
                type="button"
                onClick={() => void loadFinancialData()}
                className="ml-2 underline"
              >
                Tentar novamente
              </button>
            </div>
          ) : null}

          {tab === "dre" ? (
            <DreSection dre={dre} cashflow={cashflow} />
          ) : null}

          {tab === "repasses" ? (
            <RepassesSection
              dre={dre}
              settlements={visibleSettlements}
              filter={settlementFilter}
              payingId={payingId}
              onFilter={setSettlementFilter}
              onPay={(item) => void handleMarkSettlementPaid(item)}
              onStatement={openSettlementStatement}
            />
          ) : null}

          {tab === "contas" ? (
            <ContasSection
              dre={dre}
              expenses={visibleExpenses}
              incomeEntries={incomeEntries}
              expenseFilter={expenseFilter}
              payingId={payingId}
              onFilter={setExpenseFilter}
              onPayExpense={(id) => void handleMarkExpensePaid(id)}
            />
          ) : null}
        </>
      )}

      {expenseModalOpen ? (
        <ExpenseModal
          form={expenseForm}
          submitting={submitting}
          error={formError}
          onClose={() => setExpenseModalOpen(false)}
          onChange={setExpenseForm}
          onSubmit={handleCreateExpense}
        />
      ) : null}

      {incomeModalOpen ? (
        <IncomeModal
          form={incomeForm}
          submitting={submitting}
          error={formError}
          onClose={() => setIncomeModalOpen(false)}
          onChange={setIncomeForm}
          onSubmit={handleCreateIncome}
        />
      ) : null}
    </div>
  );
}

function DreSection({
  dre,
  cashflow,
}: {
  dre: ApiDre;
  cashflow: ApiCashflow;
}) {
  const profitPositive = dre.netProfit >= 0;

  return (
    <>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Faturamento bruto"
          value={formatCurrency(dre.grossRevenue)}
          hint={`${dre.completedAppointments} atendimento${dre.completedAppointments === 1 ? "" : "s"} concluído${dre.completedAppointments === 1 ? "" : "s"}`}
          icon={CircleDollarSign}
        />
        <SummaryCard
          label="Repasses a profissionais"
          value={formatCurrency(dre.professionalShare)}
          hint="Cota-parte do profissional-parceiro"
          icon={Users}
        />
        <SummaryCard
          label="Despesas operacionais"
          value={formatCurrency(dre.operatingExpenses)}
          hint="Aluguel, energia e demais contas pagas"
          icon={Receipt}
        />
        <SummaryCard
          label="Lucro líquido real"
          value={formatCurrency(dre.netProfit)}
          hint="Bruto − repasses − despesas"
          icon={profitPositive ? TrendingUp : TrendingDown}
          emphasis={profitPositive ? "positive" : "negative"}
        />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
          <div className="mb-4 flex items-center gap-2">
            <ScrollText className="size-4 text-[var(--accent)]" />
            <h2 className="text-sm font-semibold text-zinc-100">
              Demonstrativo de resultado
            </h2>
          </div>
          <DreRow label="(+) Faturamento bruto" value={dre.grossRevenue} />
          <DreRow
            label="(−) Cota-parte dos profissionais"
            value={-dre.professionalShare}
            muted
          />
          <DreRow label="(=) Cota-parte do salão" value={dre.salonShare} />
          <DreRow
            label="(−) Despesas operacionais"
            value={-dre.operatingExpenses}
            muted
          />
          <DreRow
            label="(=) Lucro líquido real"
            value={dre.netProfit}
            emphasis
          />
          <p className="mt-4 text-[11px] uppercase tracking-wide text-zinc-500">
            {dre.legalBasis}
          </p>
        </article>

        <article className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Repeat className="size-4 text-[var(--accent)]" />
            <h2 className="text-sm font-semibold text-zinc-100">
              Fluxo de caixa
            </h2>
          </div>
          <div className="mb-4 grid grid-cols-3 gap-2 text-center">
            <MiniStat
              label="Entradas"
              value={formatCurrency(cashflow.totalIncome)}
              tone="positive"
            />
            <MiniStat
              label="Saídas"
              value={formatCurrency(cashflow.totalExpense)}
              tone="negative"
            />
            <MiniStat
              label="Saldo"
              value={formatCurrency(cashflow.netCash)}
              tone={cashflow.netCash >= 0 ? "positive" : "negative"}
            />
          </div>
          {cashflow.byCategory.length > 0 ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {cashflow.byCategory.map((item) => (
                <span
                  key={`${item.type}-${item.category}`}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[11px] text-zinc-300"
                >
                  {CASHFLOW_CATEGORY_LABELS[item.category]}
                  <span className="font-semibold text-zinc-100">
                    {formatCurrency(item.total)}
                  </span>
                </span>
              ))}
            </div>
          ) : null}
          {cashflow.entries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 px-4 py-6 text-center text-sm text-zinc-500">
              Sem movimentações de caixa neste mês.
            </p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {cashflow.entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-100">
                      {entry.description}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {formatShortDate(entry.occurredAt)} ·{" "}
                      {CASHFLOW_CATEGORY_LABELS[entry.category]}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold",
                      entry.type === "INCOME"
                        ? "text-emerald-300"
                        : "text-rose-300",
                    )}
                  >
                    {entry.type === "INCOME" ? "+" : "−"}
                    {formatCurrency(entry.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </>
  );
}

function RepassesSection({
  dre,
  settlements,
  filter,
  payingId,
  onFilter,
  onPay,
  onStatement,
}: {
  dre: ApiDre;
  settlements: ApiSettlement[];
  filter: SettlementFilter;
  payingId: string | null;
  onFilter: (value: SettlementFilter) => void;
  onPay: (settlement: ApiSettlement) => void;
  onStatement: (settlement: ApiSettlement) => void;
}) {
  return (
    <>
      <p className="mb-4 rounded-2xl border border-[color-mix(in_srgb,var(--accent)_20%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] px-4 py-3 text-sm text-zinc-300">
        Repasse fundamentado na {dre.legalBasis}: o profissional-parceiro é
        autônomo, sem vínculo CLT. O salão retém a cota-parte operacional e
        transfere a cota-parte legal ao parceiro.
      </p>

      <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
        <div className="mb-4 flex items-center gap-2">
          <Users className="size-4 text-[var(--accent)]" />
          <h2 className="text-sm font-semibold text-zinc-100">
            Produção do período
          </h2>
        </div>
        {dre.byProfessional.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 px-4 py-6 text-center text-sm text-zinc-500">
            Nenhum atendimento concluído neste mês para calcular cotas-parte.
          </p>
        ) : (
          <ProfessionalSplitTable rows={dre.byProfessional} />
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="size-4 text-[var(--accent)]" />
            <h2 className="text-sm font-semibold text-zinc-100">
              Fechamentos e pagamentos
            </h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(
              [
                { id: "ALL", label: "Todos" },
                { id: "PENDING", label: "A pagar" },
                { id: "PAID", label: "Pagos" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onFilter(item.id)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  filter === item.id
                    ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]"
                    : "bg-zinc-950 text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {settlements.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 px-4 py-8 text-center text-sm text-zinc-500">
            Nenhum fechamento neste filtro. Use “Fechar repasses do mês” para
            gerar as cotas-parte dos atendimentos concluídos.
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                    <th className="pb-3 pr-4 font-medium">Profissional</th>
                    <th className="pb-3 pr-4 font-medium">Bruto</th>
                    <th className="pb-3 pr-4 font-medium">Cota-parte salão</th>
                    <th className="pb-3 pr-4 font-medium">Cota-parte parceiro</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-zinc-800/80 last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <p className="font-medium text-zinc-100">
                          {item.professional.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {item.appointmentCount} atendimento
                          {item.appointmentCount === 1 ? "" : "s"} ·{" "}
                          {Math.round(item.partnerShareRate * 100)}%
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-zinc-200">
                        {formatCurrency(item.grossRevenue)}
                      </td>
                      <td className="py-3 pr-4 text-zinc-300">
                        {formatCurrency(item.salonShare)}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-[var(--accent)]">
                        {formatCurrency(item.professionalShare)}
                      </td>
                      <td className="py-3 pr-4">
                        <SettlementBadge status={item.status} />
                      </td>
                      <td className="py-3">
                        <SettlementActions
                          settlement={item}
                          paying={payingId === item.id}
                          onPay={() => onPay(item)}
                          onStatement={() => onStatement(item)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {settlements.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-100">
                        {item.professional.name}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Bruto {formatCurrency(item.grossRevenue)}
                      </p>
                    </div>
                    <SettlementBadge status={item.status} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                    <span>Salão {formatCurrency(item.salonShare)}</span>
                    <span className="text-right text-[var(--accent)]">
                      Parceiro {formatCurrency(item.professionalShare)}
                    </span>
                  </div>
                  <div className="mt-3">
                    <SettlementActions
                      settlement={item}
                      paying={payingId === item.id}
                      onPay={() => onPay(item)}
                      onStatement={() => onStatement(item)}
                    />
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}

function ContasSection({
  dre,
  expenses,
  incomeEntries,
  expenseFilter,
  payingId,
  onFilter,
  onPayExpense,
}: {
  dre: ApiDre;
  expenses: ApiExpense[];
  incomeEntries: ApiCashflowEntry[];
  expenseFilter: ExpenseStatusFilter;
  payingId: string | null;
  onFilter: (value: ExpenseStatusFilter) => void;
  onPayExpense: (id: string) => void;
}) {
  return (
    <>
      <section className="grid gap-3 md:grid-cols-2">
        <SummaryCard
          label="Contas a pagar"
          value={formatCurrency(dre.accountsPayable.total)}
          hint={`${formatCurrency(dre.accountsPayable.operatingExpenses)} operacionais + ${formatCurrency(dre.accountsPayable.professionalSettlements)} em repasses`}
          icon={ArrowUpRight}
          emphasis="negative"
        />
        <SummaryCard
          label="Contas a receber"
          value={formatCurrency(dre.accountsReceivable.total)}
          hint={`${dre.accountsReceivable.pendingAppointments} agendamento${dre.accountsReceivable.pendingAppointments === 1 ? "" : "s"} aguardando pagamento`}
          icon={ArrowDownLeft}
          emphasis="positive"
        />
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
        <div className="mb-4 flex items-center gap-2">
          <Wallet className="size-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-zinc-100">
            Receitas do período
          </h2>
        </div>
        {incomeEntries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 px-4 py-6 text-center text-sm text-zinc-500">
            Nenhuma entrada de caixa. Atendimentos concluídos e receitas avulsas
            aparecem aqui.
          </p>
        ) : (
          <ul className="space-y-2">
            {incomeEntries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-100">
                    {entry.description}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {formatShortDate(entry.occurredAt)} ·{" "}
                    {CASHFLOW_CATEGORY_LABELS[entry.category]}
                  </p>
                </div>
                <span className="text-sm font-semibold text-emerald-300">
                  {formatCurrency(entry.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="size-4 text-[var(--accent)]" />
            <h2 className="text-sm font-semibold text-zinc-100">
              Despesas operacionais
            </h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(
              [
                { id: "ALL", label: "Todas" },
                { id: "PENDING", label: "A pagar" },
                { id: "PAID", label: "Pagas" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onFilter(item.id)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  expenseFilter === item.id
                    ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]"
                    : "bg-zinc-950 text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {expenses.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 px-4 py-8 text-center text-sm text-zinc-500">
            Nenhuma despesa cadastrada neste mês.
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                    <th className="pb-3 pr-4 font-medium">Descrição</th>
                    <th className="pb-3 pr-4 font-medium">Categoria</th>
                    <th className="pb-3 pr-4 font-medium">Vencimento</th>
                    <th className="pb-3 pr-4 font-medium">Valor</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className="border-b border-zinc-800/80 last:border-0"
                    >
                      <td className="py-3 pr-4 font-medium text-zinc-100">
                        {expense.description}
                      </td>
                      <td className="py-3 pr-4 text-zinc-400">
                        {CATEGORY_LABELS[expense.category]}
                      </td>
                      <td className="py-3 pr-4 text-zinc-400">
                        {formatShortDate(expense.dueDate)}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-zinc-100">
                        {formatCurrency(Number(expense.amount))}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={expense.status} />
                      </td>
                      <td className="py-3">
                        <PayAction
                          expense={expense}
                          paying={payingId === expense.id}
                          onPay={() => onPayExpense(expense.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {expenses.map((expense) => (
                <article
                  key={expense.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-100">
                        {expense.description}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {CATEGORY_LABELS[expense.category]} · vence{" "}
                        {formatShortDate(expense.dueDate)}
                      </p>
                    </div>
                    <StatusBadge status={expense.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--accent)]">
                      {formatCurrency(Number(expense.amount))}
                    </p>
                    <PayAction
                      expense={expense}
                      paying={payingId === expense.id}
                      onPay={() => onPayExpense(expense.id)}
                    />
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}

function ProfessionalSplitTable({
  rows,
}: {
  rows: ApiDre["byProfessional"];
}) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
              <th className="pb-3 pr-4 font-medium">Profissional</th>
              <th className="pb-3 pr-4 font-medium">Bruto</th>
              <th className="pb-3 pr-4 font-medium">Cota-parte salão</th>
              <th className="pb-3 font-medium">Cota-parte parceiro</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.professionalId}
                className="border-b border-zinc-800/80 last:border-0"
              >
                <td className="py-3 pr-4">
                  <p className="font-medium text-zinc-100">
                    {row.professionalName}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {row.appointmentCount} atendimento
                    {row.appointmentCount === 1 ? "" : "s"} ·{" "}
                    {Math.round(row.partnerShareRate * 100)}%
                  </p>
                </td>
                <td className="py-3 pr-4 text-zinc-200">
                  {formatCurrency(row.grossRevenue)}
                </td>
                <td className="py-3 pr-4 text-zinc-300">
                  {formatCurrency(row.salonShare)}
                </td>
                <td className="py-3 font-semibold text-[var(--accent)]">
                  {formatCurrency(row.professionalShare)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <article
            key={row.professionalId}
            className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3"
          >
            <p className="text-sm font-medium text-zinc-100">
              {row.professionalName}
            </p>
            <p className="mt-2 text-xs text-zinc-400">
              Bruto {formatCurrency(row.grossRevenue)} · Salão{" "}
              {formatCurrency(row.salonShare)}
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--accent)]">
              Parceiro {formatCurrency(row.professionalShare)}
            </p>
          </article>
        ))}
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  emphasis,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof CircleDollarSign;
  emphasis?: "positive" | "negative";
}) {
  return (
    <article
      className={cn(
        "rounded-2xl border bg-zinc-900/80 p-4",
        emphasis === "positive" && "border-emerald-500/20 bg-emerald-500/5",
        emphasis === "negative" && "border-rose-500/20 bg-rose-500/5",
        !emphasis && "border-zinc-800",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {label}
          </p>
          <p
            className={cn(
              "mt-2 text-2xl font-bold",
              emphasis === "positive" && "text-emerald-300",
              emphasis === "negative" && "text-rose-300",
              !emphasis && "text-zinc-50",
            )}
          >
            {value}
          </p>
          <p
            className={cn(
              "mt-1 text-xs",
              emphasis ? "text-zinc-400" : "text-[var(--accent)]",
            )}
          >
            {hint}
          </p>
        </div>
        <AccentIconWrap className="size-11">
          <Icon className="size-5" strokeWidth={2.2} />
        </AccentIconWrap>
      </div>
    </article>
  );
}

function DreRow({
  label,
  value,
  muted,
  emphasis,
}: {
  label: string;
  value: number;
  muted?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-zinc-800/80 py-2.5 last:border-0",
        emphasis && "border-t border-zinc-700 pt-3",
      )}
    >
      <span className={cn("text-sm", muted ? "text-zinc-500" : "text-zinc-300")}>
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-semibold",
          emphasis
            ? value >= 0
              ? "text-emerald-300"
              : "text-rose-300"
            : "text-zinc-100",
        )}
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "positive" | "negative";
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-2 py-3">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-sm font-semibold",
          tone === "positive" ? "text-emerald-300" : "text-rose-300",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: ApiExpenseStatus }) {
  const paid = status === "PAID";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        paid
          ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20"
          : "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20",
      )}
    >
      {paid ? "Pago" : "Pendente"}
    </span>
  );
}

function SettlementBadge({ status }: { status: ApiSettlement["status"] }) {
  const paid = status === "PAID";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        paid
          ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20"
          : "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20",
      )}
    >
      {paid ? "Pago" : "A pagar"}
    </span>
  );
}

function PayAction({
  expense,
  paying,
  onPay,
}: {
  expense: ApiExpense;
  paying: boolean;
  onPay: () => void;
}) {
  if (expense.status === "PAID") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
        <CheckCircle2 className="size-3.5 text-emerald-400" />
        Quitada
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onPay}
      disabled={paying}
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-700 disabled:opacity-50"
    >
      {paying ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <CalendarClock className="size-3.5 text-[var(--accent)]" />
      )}
      Marcar pago
    </button>
  );
}

function SettlementActions({
  settlement,
  paying,
  onPay,
  onStatement,
}: {
  settlement: ApiSettlement;
  paying: boolean;
  onPay: () => void;
  onStatement: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {settlement.status === "PENDING" ? (
        <button
          type="button"
          onClick={onPay}
          disabled={paying}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-700 disabled:opacity-50"
        >
          {paying ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="size-3.5 text-emerald-400" />
          )}
          Marcar como pago
        </button>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
          <CheckCircle2 className="size-3.5 text-emerald-400" />
          Quitado
        </span>
      )}
      <button
        type="button"
        onClick={onStatement}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-700"
      >
        <FileText className="size-3.5 text-[var(--accent)]" />
        Emitir extrato
      </button>
    </div>
  );
}

function ExpenseModal({
  form,
  submitting,
  error,
  onClose,
  onChange,
  onSubmit,
}: {
  form: ExpenseFormState;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onChange: React.Dispatch<React.SetStateAction<ExpenseFormState>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 md:items-center">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-50">
            Adicionar nova despesa
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-800 p-2 text-zinc-400"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Descrição">
            <input
              required
              value={form.description}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Ex: Aluguel do salão"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoria">
              <select
                value={form.category}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    category: event.target.value as ApiExpenseCategory,
                  }))
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none"
              >
                {CATEGORY_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Valor (R$)">
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={form.amount}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                placeholder="0,00"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
              />
            </Field>
          </div>
          <Field label="Data de vencimento">
            <input
              required
              type="date"
              value={form.dueDate}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  dueDate: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none"
            />
          </Field>
          <label className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={form.alreadyPaid}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  alreadyPaid: event.target.checked,
                }))
              }
              className="size-4 accent-[var(--accent)]"
            />
            Já foi paga
          </label>
          {error ? (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50"
          >
            {submitting ? "Salvando..." : "Cadastrar despesa"}
          </button>
        </form>
      </div>
    </div>
  );
}

function IncomeModal({
  form,
  submitting,
  error,
  onClose,
  onChange,
  onSubmit,
}: {
  form: IncomeFormState;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onChange: React.Dispatch<React.SetStateAction<IncomeFormState>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 md:items-center">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-50">
            Lançar receita avulsa
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-800 p-2 text-zinc-400"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Descrição">
            <input
              required
              value={form.description}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Ex: Venda de produto"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valor (R$)">
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={form.amount}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                placeholder="0,00"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
              />
            </Field>
            <Field label="Data">
              <input
                required
                type="date"
                value={form.occurredAt}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    occurredAt: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none"
              />
            </Field>
          </div>
          {error ? (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50"
          >
            {submitting ? "Salvando..." : "Lançar receita"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      {children}
    </label>
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

function openSettlementStatement(settlement: ApiSettlement) {
  const sharePct = Math.round(settlement.partnerShareRate * 100);
  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Extrato de repasse · ${settlement.professional.name}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; background: #09090b; color: #fafafa; padding: 32px; }
      h1 { font-size: 20px; margin: 0 0 8px; }
      p, td { font-size: 14px; color: #d4d4d8; }
      table { width: 100%; border-collapse: collapse; margin-top: 24px; }
      td { padding: 10px 0; border-bottom: 1px solid #27272a; }
      .accent { color: #fbbf24; font-weight: 700; }
      .muted { color: #71717a; font-size: 12px; }
    </style>
  </head>
  <body>
    <p class="muted">${settlement.legalBasis} · profissional-parceiro autônomo, sem vínculo CLT</p>
    <h1>Extrato de repasse</h1>
    <p>${settlement.professional.name} · ${settlement.professional.phone}</p>
    <table>
      <tr><td>Período</td><td>${formatShortDate(settlement.periodStart)} — ${formatShortDate(settlement.periodEnd)}</td></tr>
      <tr><td>Atendimentos</td><td>${settlement.appointmentCount}</td></tr>
      <tr><td>Valor bruto</td><td>${formatCurrency(settlement.grossRevenue)}</td></tr>
      <tr><td>Cota-parte do salão (${100 - sharePct}%)</td><td>${formatCurrency(settlement.salonShare)}</td></tr>
      <tr><td>Cota-parte do profissional (${sharePct}%)</td><td class="accent">${formatCurrency(settlement.professionalShare)}</td></tr>
      <tr><td>Status</td><td>${settlement.status === "PAID" ? "Pago" : "A pagar"}</td></tr>
    </table>
  </body>
</html>`;

  const popup = window.open("", "_blank", "width=720,height=900");
  if (!popup) {
    return;
  }

  popup.document.write(html);
  popup.document.close();
  popup.focus();
  popup.print();
}
