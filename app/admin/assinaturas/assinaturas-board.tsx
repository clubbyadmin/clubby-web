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
  type ApiClient,
  type ApiIncludedService,
  type ApiPaymentStatus,
  type ApiService,
  type ApiSubscriptionMember,
  type ApiSubscriptionPlan,
  type ApiTenantClubSummary,
} from "@/services/api";
import {
  CalendarClock,
  Crown,
  Loader2,
  Plus,
  Repeat,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const INTERVAL_OPTIONS = [
  { days: 15, label: "Quinzenal" },
  { days: 30, label: "Mensal" },
  { days: 90, label: "Trimestral" },
] as const;

type MemberFilter = "ALL" | "CURRENT" | "OVERDUE";

type IncludedRow = {
  key: string;
  serviceId: string;
  label: string;
  quantity: string;
};

type PlanFormState = {
  name: string;
  description: string;
  price: string;
  intervalDays: number;
  creditsPerCycle: string;
  included: IncludedRow[];
};

const EMPTY_SUMMARY: ApiTenantClubSummary = {
  activeMembers: 0,
  pastDueMembers: 0,
  canceledMembers: 0,
  mrr: 0,
  overdueAmount: 0,
  recurringRevenue: 0,
};

const INITIAL_FORM: PlanFormState = {
  name: "",
  description: "",
  price: "",
  intervalDays: 30,
  creditsPerCycle: "4",
  included: [emptyIncludedRow()],
};

function emptyIncludedRow(key = "row-1"): IncludedRow {
  return {
    key,
    serviceId: "",
    label: "",
    quantity: "1",
  };
}

export function AssinaturasBoard() {
  const { tenant, loading: tenantLoading, reload } = useTenant();
  const tenantId = tenant.id === "local" ? undefined : tenant.id;

  const [plans, setPlans] = useState<ApiSubscriptionPlan[]>([]);
  const [members, setMembers] = useState<ApiSubscriptionMember[]>([]);
  const [summary, setSummary] = useState<ApiTenantClubSummary>(EMPTY_SUMMARY);
  const [services, setServices] = useState<ApiService[]>([]);
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [form, setForm] = useState<PlanFormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [subscribeForm, setSubscribeForm] = useState({
    clientId: "",
    planId: "",
  });

  const loadClubData = useCallback(async () => {
    if (!tenantId) {
      setPlans([]);
      setMembers([]);
      setSummary(EMPTY_SUMMARY);
      setServices([]);
      setClients([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [plansResponse, clubResponse, servicesResponse, clientsResponse] =
        await Promise.all([
          api.getSubscriptionPlans({ tenantId }),
          api.getTenantClub(tenantId),
          api.getServices(tenantId),
          api.getClients({ tenantId }),
        ]);

      setPlans(plansResponse);
      setMembers(clubResponse.members);
      setSummary(clubResponse.summary);
      setServices(servicesResponse);
      setClients(clientsResponse);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setPlans([]);
      setMembers([]);
      setSummary(EMPTY_SUMMARY);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadClubData();
  }, [loadClubData]);

  const activePlans = useMemo(
    () => plans.filter((plan) => plan.isActive),
    [plans],
  );

  const activeMembers = useMemo(
    () => members.filter((member) => member.status === "ACTIVE"),
    [members],
  );

  const totalMrr = summary.mrr;
  const overdueAmount = summary.overdueAmount;

  const visibleMembers = useMemo(() => {
    if (memberFilter === "ALL") {
      return members;
    }

    return members.filter((member) => member.paymentStatus === memberFilter);
  }, [memberFilter, members]);

  async function handleCreatePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tenantId) {
      setFormError("Tenant indisponível. Recarregue o painel e tente novamente.");
      return;
    }

    if (!form.name.trim()) {
      setFormError("Informe o nome do plano.");
      return;
    }

    const price = Number(form.price.replace(",", "."));
    const creditsPerCycle = Number(form.creditsPerCycle);

    if (!Number.isFinite(price) || price < 0) {
      setFormError("Informe um valor mensal válido.");
      return;
    }

    if (!Number.isInteger(creditsPerCycle) || creditsPerCycle <= 0) {
      setFormError("Informe um limite de créditos maior que zero.");
      return;
    }

    const includedServices = parseIncludedRows(form.included, services);

    if (
      form.included.some((row) => row.label.trim() || row.serviceId) &&
      includedServices.length === 0
    ) {
      setFormError(
        "Revise os serviços inclusos: informe nome e quantidade por ciclo.",
      );
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await api.createSubscriptionPlan({
        tenantId,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price,
        intervalDays: form.intervalDays,
        creditsPerCycle,
        maxUsesPerMonth: creditsPerCycle,
        billingInterval: "MONTHLY",
        includedServices:
          includedServices.length > 0 ? includedServices : undefined,
        isActive: true,
      });

      setModalOpen(false);
      setForm({ ...INITIAL_FORM, included: [emptyIncludedRow()] });
      await Promise.all([loadClubData(), reload()]);
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tenantId) {
      setFormError("Tenant indisponível. Recarregue o painel e tente novamente.");
      return;
    }

    if (!subscribeForm.clientId || !subscribeForm.planId) {
      setFormError("Selecione o cliente e o plano do clube.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await api.subscribeClient({
        tenantId,
        clientId: subscribeForm.clientId,
        planId: subscribeForm.planId,
      });
      setSubscribeOpen(false);
      setSubscribeForm({ clientId: "", planId: "" });
      await Promise.all([loadClubData(), reload()]);
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  const clubClients = clients.filter((client) => client.userId);

  return (
    <div className="relative flex flex-1 flex-col px-4 pb-4 pt-6 sm:px-6 lg:px-10 xl:px-12">
      <header className="mb-4 flex flex-col gap-4 lg:mb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <TenantBadge />
          <p className="mt-3 text-sm text-zinc-400">
            Clube de assinaturas · {tenant.name}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setSubscribeForm({
                clientId: "",
                planId: activePlans[0]?.id ?? "",
              });
              setSubscribeOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-100"
          >
            <Users className="size-4" />
            Associar membro
          </button>
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setForm({ ...INITIAL_FORM, included: [emptyIncludedRow()] });
              setModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
          >
            <Plus className="size-4" />
            Criar novo plano
          </button>
        </div>
      </header>

      <AdminNav className="mb-4 lg:hidden" />

      {tenantLoading || (loading && plans.length === 0 && members.length === 0) ? (
        <LoadingState message="Carregando clube de assinaturas..." />
      ) : !tenantId ? (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-6 text-center text-sm text-zinc-400">
          Não foi possível identificar o estabelecimento. Recarregue o painel
          para gerenciar o clube.
        </p>
      ) : error && plans.length === 0 && members.length === 0 ? (
        <ErrorState message={error} onRetry={() => void loadClubData()} />
      ) : (
        <>
          {error ? (
            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
              <button
                type="button"
                onClick={() => void loadClubData()}
                className="ml-2 underline"
              >
                Tentar novamente
              </button>
            </div>
          ) : null}

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="MRR do clube"
              value={formatCurrency(totalMrr)}
              hint="Faturamento recorrente mensal dos membros em dia"
              icon={Repeat}
            />
            <SummaryCard
              label="Membros ativos"
              value={String(summary.activeMembers)}
              hint={
                summary.pastDueMembers > 0
                  ? `${summary.pastDueMembers} inadimplente${summary.pastDueMembers === 1 ? "" : "s"}`
                  : "Assinaturas em dia"
              }
              icon={Users}
            />
            <SummaryCard
              label="Inadimplência"
              value={formatCurrency(overdueAmount)}
              hint="Mensalidades em atraso a recuperar no caixa"
              icon={CalendarClock}
            />
            <SummaryCard
              label="Planos ativos"
              value={String(activePlans.length)}
              hint={`${plans.length} cadastrado${plans.length === 1 ? "" : "s"} no clube`}
              icon={Crown}
            />
          </section>

          <section className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="size-4 text-[var(--accent)]" />
              <h2 className="text-sm font-semibold text-zinc-100">
                Planos ativos
              </h2>
            </div>

            {activePlans.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/60 px-4 py-8 text-center text-sm text-zinc-500">
                Nenhum plano ativo. Crie o primeiro plano do clube para começar
                a gerar receita recorrente.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {activePlans.map((plan) => {
                  const planMembers = activeMembers.filter(
                    (member) => member.planId === plan.id,
                  );
                  const planMrr = planMembers.reduce(
                    (sum, member) =>
                      sum +
                      monthlyEquivalent(
                        Number(member.plan.price),
                        member.plan.intervalDays,
                      ),
                    0,
                  );

                  return (
                    <article
                      key={plan.id}
                      className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-100">
                            {plan.name}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {intervalLabel(plan.intervalDays)} ·{" "}
                            {(plan.maxUsesPerMonth ?? plan.creditsPerCycle) === 1
                              ? "1 uso/mês"
                              : `${plan.maxUsesPerMonth ?? plan.creditsPerCycle} usos/mês`}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]">
                          {formatCurrency(Number(plan.price))}
                        </span>
                      </div>

                      {plan.description ? (
                        <p className="mt-3 line-clamp-2 text-xs text-zinc-400">
                          {plan.description}
                        </p>
                      ) : null}

                      {plan.includedServices.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {plan.includedServices.map((item) => (
                            <span
                              key={`${plan.id}-${item.label}`}
                              className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-300"
                            >
                              {item.quantityPerCycle}× {item.label}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-4 flex items-end justify-between border-t border-zinc-800 pt-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                            MRR do plano
                          </p>
                          <p className="text-lg font-bold text-[var(--accent)]">
                            {formatCurrency(planMrr)}
                          </p>
                        </div>
                        <p className="text-xs text-zinc-500">
                          {planMembers.length === 1
                            ? "1 membro"
                            : `${planMembers.length} membros`}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-[var(--accent)]" />
                <h2 className="text-sm font-semibold text-zinc-100">
                  Membros do clube
                </h2>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {(
                  [
                    { id: "ALL", label: "Todos" },
                    { id: "CURRENT", label: "Em dia" },
                    { id: "OVERDUE", label: "Inadimplentes" },
                  ] as const
                ).map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setMemberFilter(filter.id)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      memberFilter === filter.id
                        ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]"
                        : "bg-zinc-950 text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200",
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {visibleMembers.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 px-4 py-8 text-center text-sm text-zinc-500">
                Nenhum assinante neste filtro. Os membros aparecem aqui quando
                um cliente assina um plano do clube.
              </p>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                        <th className="pb-3 pr-4 font-medium">Cliente</th>
                        <th className="pb-3 pr-4 font-medium">Plano ativo</th>
                        <th className="pb-3 pr-4 font-medium">Pagamento</th>
                        <th className="pb-3 pr-4 font-medium">Renovação</th>
                        <th className="pb-3 font-medium">Créditos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleMembers.map((member) => (
                        <tr
                          key={member.id}
                          className="border-b border-zinc-800/80 last:border-0"
                        >
                          <td className="py-3 pr-4">
                            <p className="font-medium text-zinc-100">
                              {member.customer.name}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {member.customer.phone}
                            </p>
                          </td>
                          <td className="py-3 pr-4 text-zinc-300">
                            {member.plan.name}
                          </td>
                          <td className="py-3 pr-4">
                            <PaymentBadge status={member.paymentStatus} />
                          </td>
                          <td className="py-3 pr-4 text-zinc-400">
                            {formatRenewalDate(member.renewalDate)}
                          </td>
                          <td className="py-3 text-zinc-300">
                            {member.creditsRemaining}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 md:hidden">
                  {visibleMembers.map((member) => (
                    <article
                      key={member.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-100">
                            {member.customer.name}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {member.plan.name}
                          </p>
                        </div>
                        <PaymentBadge status={member.paymentStatus} />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarClock className="size-3.5 text-[var(--accent)]" />
                          Renova {formatRenewalDate(member.renewalDate)}
                        </span>
                        <span>{member.creditsRemaining} créditos</span>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        </>
      )}

      {modalOpen ? (
        <PlanModal
          form={form}
          services={services}
          submitting={submitting}
          error={formError}
          onClose={() => setModalOpen(false)}
          onChange={setForm}
          onSubmit={handleCreatePlan}
        />
      ) : null}

      {subscribeOpen ? (
        <SubscribeModal
          clients={clubClients}
          plans={activePlans}
          form={subscribeForm}
          submitting={submitting}
          error={formError}
          onClose={() => setSubscribeOpen(false)}
          onChange={setSubscribeForm}
          onSubmit={handleSubscribe}
        />
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Crown;
}) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-zinc-50">{value}</p>
          <p className="mt-1 text-xs text-[var(--accent)]">{hint}</p>
        </div>
        <AccentIconWrap className="size-11">
          <Icon className="size-5" strokeWidth={2.2} />
        </AccentIconWrap>
      </div>
    </article>
  );
}

function PaymentBadge({ status }: { status: ApiPaymentStatus }) {
  const config: Record<
    ApiPaymentStatus,
    { label: string; className: string }
  > = {
    CURRENT: {
      label: "Em dia",
      className: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20",
    },
    OVERDUE: {
      label: "Inadimplente",
      className: "bg-rose-500/10 text-rose-300 ring-rose-500/20",
    },
    CANCELLED: {
      label: "Cancelado",
      className: "bg-zinc-800 text-zinc-400 ring-zinc-700",
    },
    EXPIRED: {
      label: "Expirado",
      className: "bg-amber-500/10 text-amber-300 ring-amber-500/20",
    },
  };

  const item = config[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1",
        item.className,
      )}
    >
      {item.label}
    </span>
  );
}

function PlanModal({
  form,
  services,
  submitting,
  error,
  onClose,
  onChange,
  onSubmit,
}: {
  form: PlanFormState;
  services: ApiService[];
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onChange: React.Dispatch<React.SetStateAction<PlanFormState>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 md:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-50">
            Criar novo plano de assinatura
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
          <Field label="Nome do plano">
            <input
              required
              value={form.name}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Ex: Plano Vip Barba Ilimitada"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
            />
          </Field>

          <Field label="Descrição">
            <textarea
              value={form.description}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              rows={2}
              placeholder="Benefícios e regras do ciclo"
              className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valor do ciclo (R$)">
              <input
                required
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.price}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
                }
                placeholder="129,90"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
              />
            </Field>

            <Field label="Periodicidade">
              <select
                value={form.intervalDays}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    intervalDays: Number(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none"
              >
                {INTERVAL_OPTIONS.map((option) => (
                  <option key={option.days} value={option.days}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Limite de usos por mês">
            <input
              required
              type="number"
              min="1"
              step="1"
              value={form.creditsPerCycle}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  creditsPerCycle: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
            />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Serviços inclusos
              </span>
              <button
                type="button"
                onClick={() =>
                  onChange((current) => ({
                    ...current,
                    included: [
                      ...current.included,
                      emptyIncludedRow(`row-${current.included.length + 1}`),
                    ],
                  }))
                }
                className="text-xs font-semibold text-[var(--accent)]"
              >
                + Adicionar
              </button>
            </div>

            <div className="space-y-2">
              {form.included.map((row) => (
                <IncludedServiceRow
                  key={row.key}
                  row={row}
                  services={services}
                  onChange={onChange}
                />
              ))}
            </div>
          </div>

          {error ? (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Cadastrar plano"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function IncludedServiceRow({
  row,
  services,
  onChange,
}: {
  row: IncludedRow;
  services: ApiService[];
  onChange: React.Dispatch<React.SetStateAction<PlanFormState>>;
}) {
  const isCustom = row.serviceId === "__custom__";

  function updateRow(patch: Partial<IncludedRow>) {
    onChange((current) => ({
      ...current,
      included: current.included.map((item) =>
        item.key === row.key ? { ...item, ...patch } : item,
      ),
    }));
  }

  return (
    <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-2">
      <div className="grid grid-cols-[1fr_5rem_auto] gap-2">
        {services.length > 0 ? (
          <select
            value={row.serviceId}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "__custom__") {
                updateRow({ serviceId: "__custom__", label: row.label });
                return;
              }

              const service = services.find((entry) => entry.id === value);
              updateRow({ serviceId: value, label: service?.name ?? "" });
            }}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none"
          >
            <option value="">Serviço</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
            <option value="__custom__">Outro (informar nome)</option>
          </select>
        ) : (
          <input
            value={row.label}
            onChange={(event) => updateRow({ label: event.target.value })}
            placeholder="Ex: Manicure"
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
          />
        )}

        <input
          type="number"
          min="1"
          step="1"
          value={row.quantity}
          onChange={(event) => updateRow({ quantity: event.target.value })}
          className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none"
          aria-label="Quantidade por ciclo"
        />

        <button
          type="button"
          onClick={() =>
            onChange((current) => ({
              ...current,
              included:
                current.included.length === 1
                  ? [emptyIncludedRow()]
                  : current.included.filter((item) => item.key !== row.key),
            }))
          }
          className="rounded-xl border border-zinc-800 p-2 text-zinc-500 hover:text-zinc-200"
          aria-label="Remover serviço"
        >
          <X className="size-4" />
        </button>
      </div>

      {services.length > 0 && isCustom ? (
        <input
          value={row.label}
          onChange={(event) => updateRow({ label: event.target.value })}
          placeholder="Nome do serviço personalizado"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
        />
      ) : null}
    </div>
  );
}

function SubscribeModal({
  clients,
  plans,
  form,
  submitting,
  error,
  onClose,
  onChange,
  onSubmit,
}: {
  clients: ApiClient[];
  plans: ApiSubscriptionPlan[];
  form: { clientId: string; planId: string };
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onChange: React.Dispatch<
    React.SetStateAction<{ clientId: string; planId: string }>
  >;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 md:items-center">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-50">
            Associar cliente ao clube
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
          <Field label="Cliente">
            <select
              required
              value={form.clientId}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  clientId: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none"
            >
              <option value="">Selecione</option>
              {clients.map((client) => (
                <option key={client.id} value={client.userId ?? ""}>
                  {client.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Plano mensal">
            <select
              required
              value={form.planId}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  planId: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none"
            >
              <option value="">Selecione</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} · {formatCurrency(Number(plan.price))}/mês
                </option>
              ))}
            </select>
          </Field>
          {error ? (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting || plans.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Associando...
              </>
            ) : (
              "Ativar assinatura"
            )}
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

function monthlyEquivalent(price: number, intervalDays: number) {
  const days = intervalDays > 0 ? intervalDays : 30;
  return (price / days) * 30;
}

function intervalLabel(days: number) {
  const match = INTERVAL_OPTIONS.find((option) => option.days === days);
  return match?.label ?? `A cada ${days} dias`;
}

function formatRenewalDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function parseIncludedRows(
  rows: IncludedRow[],
  services: ApiService[],
): ApiIncludedService[] {
  return rows.flatMap((row) => {
    const quantity = Number(row.quantity);
    const service = services.find((item) => item.id === row.serviceId);
    const label = (row.label || service?.name || "").trim();

    if (!label || !Number.isInteger(quantity) || quantity <= 0) {
      return [];
    }

    return [
      {
        serviceId: row.serviceId && row.serviceId !== "__custom__" ? row.serviceId : undefined,
        label,
        quantityPerCycle: quantity,
      },
    ];
  });
}
