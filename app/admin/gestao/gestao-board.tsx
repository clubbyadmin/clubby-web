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
  type ApiGoal,
  type ApiGoalPeriod,
  type ApiGoalStatus,
  type ApiGoalsResponse,
  type ApiManagementUnit,
  type ApiUser,
} from "@/services/api";
import {
  Building2,
  CheckCircle2,
  Plus,
  Target,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const EMPTY_GOALS: ApiGoalsResponse = {
  tenantId: "",
  networkTenantIds: [],
  summary: {
    goalCount: 0,
    achievedCount: 0,
    targetAmount: 0,
    currentAmount: 0,
    progressPercent: 0,
  },
  goals: [],
};

const PERIOD_LABELS: Record<ApiGoalPeriod, string> = {
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
};

const STATUS_LABELS: Record<ApiGoalStatus, string> = {
  ACTIVE: "Em andamento",
  COMPLETED: "Atingida",
  MISSED: "Não atingida",
  CANCELLED: "Cancelada",
};

type GoalFilter = "ALL" | "UNIT" | "PROFESSIONAL";
type GoalScope = "UNIT" | "PROFESSIONAL";

type GoalFormState = {
  scope: GoalScope;
  professionalId: string;
  period: ApiGoalPeriod;
  targetAmount: string;
  startDate: string;
  endDate: string;
};

export function GestaoBoard() {
  const { tenant, loading: tenantLoading } = useTenant();
  const homeTenantId = tenant.id === "local" ? undefined : tenant.id;

  const [units, setUnits] = useState<ApiManagementUnit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [includeNetwork, setIncludeNetwork] = useState(false);
  const [goalsData, setGoalsData] = useState<ApiGoalsResponse>(EMPTY_GOALS);
  const [staff, setStaff] = useState<ApiUser[]>([]);
  const [filter, setFilter] = useState<GoalFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<GoalFormState>(initialGoalForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedUnit =
    units.find((unit) => unit.id === selectedUnitId) ?? units[0];
  const workingTenantId = selectedUnit?.id ?? homeTenantId;
  const canSeeNetwork = Boolean(selectedUnit?.isHeadquarters) && units.length > 1;

  const loadUnits = useCallback(async () => {
    if (!homeTenantId) {
      setUnits([]);
      setSelectedUnitId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.getUnits({ tenantId: homeTenantId });
      setUnits(response.units);
      setSelectedUnitId((current) => {
        if (current && response.units.some((unit) => unit.id === current)) {
          return current;
        }

        const currentUnit = response.units.find((unit) => unit.isCurrent);
        return currentUnit?.id ?? response.headquarters.id;
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setUnits([]);
    } finally {
      setLoading(false);
    }
  }, [homeTenantId]);

  const loadGoals = useCallback(async () => {
    if (!workingTenantId) {
      setGoalsData(EMPTY_GOALS);
      setStaff([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [goalsResponse, staffResponse] = await Promise.all([
        api.getGoals({
          tenantId: workingTenantId,
          includeNetwork: includeNetwork && canSeeNetwork,
        }),
        api.getUsers({ role: "PROFESSIONAL", tenantId: workingTenantId }),
      ]);

      setGoalsData(goalsResponse);
      setStaff(staffResponse);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setGoalsData(EMPTY_GOALS);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [canSeeNetwork, includeNetwork, workingTenantId]);

  useEffect(() => {
    void loadUnits();
  }, [loadUnits]);

  useEffect(() => {
    if (!workingTenantId) {
      return;
    }

    void loadGoals();
  }, [loadGoals, workingTenantId]);

  const visibleGoals = useMemo(() => {
    if (filter === "ALL") {
      return goalsData.goals;
    }

    return goalsData.goals.filter((goal) =>
      filter === "UNIT" ? goal.scope === "UNIT" : goal.scope === "PROFESSIONAL",
    );
  }, [filter, goalsData.goals]);

  const unitGoals = visibleGoals.filter((goal) => goal.scope === "UNIT");
  const professionalGoals = visibleGoals.filter(
    (goal) => goal.scope === "PROFESSIONAL",
  );

  const hasLoaded = units.length > 0 || goalsData.goals.length > 0;

  async function handleCreateGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workingTenantId) {
      setFormError("Tenant indisponível. Recarregue o painel e tente novamente.");
      return;
    }

    if (form.scope === "PROFESSIONAL" && !form.professionalId) {
      setFormError("Selecione o profissional da meta individual.");
      return;
    }

    const targetAmount = Number(form.targetAmount.replace(",", "."));

    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      setFormError("Informe um valor alvo maior que zero.");
      return;
    }

    if (!form.startDate || !form.endDate) {
      setFormError("Informe o período da meta.");
      return;
    }

    const startDate = dateInputToIso(form.startDate, "start");
    const endDate = dateInputToIso(form.endDate, "end");

    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
      setFormError("A data final deve ser posterior à inicial.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await api.createGoal({
        tenantId: workingTenantId,
        professionalId:
          form.scope === "PROFESSIONAL" ? form.professionalId : null,
        targetAmount,
        period: form.period,
        startDate,
        endDate,
      });

      setModalOpen(false);
      setForm(initialGoalForm());
      await loadGoals();
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
            Metas e unidades · {selectedUnit?.name ?? tenant.name}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setForm(initialGoalForm());
            setModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
        >
          <Plus className="size-4" />
          Definir nova meta
        </button>
      </header>

      <AdminNav className="mb-6 lg:hidden" />

      {tenantLoading || (loading && !hasLoaded) ? (
        <LoadingState message="Carregando unidades e metas..." />
      ) : !homeTenantId ? (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-6 text-center text-sm text-zinc-400">
          Não foi possível identificar o estabelecimento. Recarregue o painel
          para carregar a gestão.
        </p>
      ) : error && !hasLoaded ? (
        <ErrorState message={error} onRetry={() => void loadUnits()} />
      ) : (
        <>
          {error ? (
            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
              <button
                type="button"
                onClick={() => void loadGoals()}
                className="ml-2 underline"
              >
                Tentar novamente
              </button>
            </div>
          ) : null}

          <UnitSelector
            units={units}
            selectedUnitId={selectedUnit?.id ?? ""}
            includeNetwork={includeNetwork && canSeeNetwork}
            canSeeNetwork={canSeeNetwork}
            onSelect={(unitId) => {
              setIncludeNetwork(false);
              setSelectedUnitId(unitId);
            }}
            onToggleNetwork={setIncludeNetwork}
          />

          <section className="mt-4 grid gap-3 sm:grid-cols-3">
            <SummaryCard
              label="Progresso da equipe"
              value={`${goalsData.summary.progressPercent}%`}
              hint={`${formatCurrency(goalsData.summary.currentAmount)} de ${formatCurrency(goalsData.summary.targetAmount)}`}
              icon={Trophy}
            />
            <SummaryCard
              label="Metas ativas"
              value={String(goalsData.summary.goalCount)}
              hint={`${goalsData.summary.achievedCount} atingida${goalsData.summary.achievedCount === 1 ? "" : "s"}`}
              icon={Target}
            />
            <SummaryCard
              label="Profissionais"
              value={String(staff.length)}
              hint="Equipe da unidade selecionada"
              icon={Users}
            />
          </section>

          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
            {(
              [
                { id: "ALL", label: "Todas" },
                { id: "UNIT", label: "Unidade" },
                { id: "PROFESSIONAL", label: "Individuais" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition",
                  filter === item.id
                    ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]"
                    : "bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {visibleGoals.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/50 px-4 py-10 text-center text-sm text-zinc-500">
              Nenhuma meta neste recorte. Defina o faturamento da unidade ou de
              um profissional para acompanhar o atingimento.
            </p>
          ) : (
            <>
              {unitGoals.length > 0 ? (
                <section className="mt-6">
                  <div className="mb-3 flex items-center gap-2">
                    <Building2 className="size-4 text-[var(--accent)]" />
                    <h2 className="text-sm font-semibold text-zinc-100">
                      Meta da unidade
                    </h2>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {unitGoals.map((goal) => (
                      <GoalCard key={goal.id} goal={goal} />
                    ))}
                  </div>
                </section>
              ) : null}

              {professionalGoals.length > 0 ? (
                <section className="mt-6">
                  <div className="mb-3 flex items-center gap-2">
                    <Users className="size-4 text-[var(--accent)]" />
                    <h2 className="text-sm font-semibold text-zinc-100">
                      Metas individuais
                    </h2>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {professionalGoals.map((goal) => (
                      <GoalCard key={goal.id} goal={goal} />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </>
      )}

      {modalOpen ? (
        <GoalModal
          form={form}
          staff={staff}
          unitName={selectedUnit?.name ?? tenant.name}
          submitting={submitting}
          error={formError}
          onClose={() => setModalOpen(false)}
          onChange={setForm}
          onSubmit={handleCreateGoal}
        />
      ) : null}
    </div>
  );
}

function UnitSelector({
  units,
  selectedUnitId,
  includeNetwork,
  canSeeNetwork,
  onSelect,
  onToggleNetwork,
}: {
  units: ApiManagementUnit[];
  selectedUnitId: string;
  includeNetwork: boolean;
  canSeeNetwork: boolean;
  onSelect: (unitId: string) => void;
  onToggleNetwork: (value: boolean) => void;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-[var(--accent)]" />
          <h2 className="text-sm font-semibold text-zinc-100">
            Unidades da rede
          </h2>
        </div>
        <p className="text-xs text-zinc-500">
          {units.length} unidade{units.length === 1 ? "" : "s"} sob gestão
        </p>
      </div>

      <div className="md:hidden">
        <select
          value={selectedUnitId}
          onChange={(event) => onSelect(event.target.value)}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none"
        >
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
              {unit.isHeadquarters ? " · Matriz" : " · Filial"}
            </option>
          ))}
        </select>
      </div>

      <div className="hidden gap-2 overflow-x-auto pb-1 md:flex">
        {units.map((unit) => {
          const active = unit.id === selectedUnitId && !includeNetwork;

          return (
            <button
              key={unit.id}
              type="button"
              onClick={() => onSelect(unit.id)}
              className={cn(
                "inline-flex shrink-0 flex-col rounded-2xl border px-4 py-3 text-left transition",
                active
                  ? "border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]"
                  : "border-zinc-800 bg-zinc-950 hover:border-zinc-700",
              )}
            >
              <span className="text-sm font-semibold text-zinc-100">
                {unit.name}
              </span>
              <span className="mt-1 text-[11px] uppercase tracking-wide text-zinc-500">
                {unit.isHeadquarters ? "Matriz" : "Filial"}
              </span>
            </button>
          );
        })}
      </div>

      {canSeeNetwork ? (
        <label className="mt-3 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2.5 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={includeNetwork}
            onChange={(event) => onToggleNetwork(event.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          Incluir filiais no consolidado de metas
        </label>
      ) : null}
    </section>
  );
}

function GoalCard({ goal }: { goal: ApiGoal }) {
  const title =
    goal.scope === "PROFESSIONAL"
      ? (goal.professional?.name ?? "Profissional")
      : goal.tenant.name;

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-100">{title}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {PERIOD_LABELS[goal.period]} · {formatShortDate(goal.startDate)} —{" "}
            {formatShortDate(goal.endDate)}
            {goal.scope === "PROFESSIONAL" ? " · individual" : " · unidade"}
          </p>
        </div>
        <StatusBadge status={goal.status} />
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Realizado
          </p>
          <p className="mt-1 text-xl font-bold text-zinc-50">
            {formatCurrency(goal.currentAmount)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Alvo</p>
          <p className="mt-1 text-sm font-semibold text-[var(--accent)]">
            {formatCurrency(goal.targetAmount)}
          </p>
        </div>
      </div>

      <ProgressBar
        percent={goal.progressPercent}
        achieved={goal.achieved}
        missed={goal.status === "MISSED"}
      />

      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
        <span>
          {goal.appointmentCount} atendimento
          {goal.appointmentCount === 1 ? "" : "s"} faturado
          {goal.appointmentCount === 1 ? "" : "s"}
        </span>
        <span>
          {goal.achieved
            ? "Meta batida"
            : `Faltam ${formatCurrency(goal.remainingAmount)}`}
        </span>
      </div>
    </article>
  );
}

function ProgressBar({
  percent,
  achieved,
  missed,
}: {
  percent: number;
  achieved: boolean;
  missed: boolean;
}) {
  const width = Math.min(100, Math.max(0, percent));

  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
        <span className="text-zinc-400">Atingimento</span>
        <span
          className={cn(
            achieved && "text-emerald-300",
            missed && "text-rose-300",
            !achieved && !missed && "text-[var(--accent)]",
          )}
        >
          {percent}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            achieved && "bg-emerald-400",
            missed && "bg-rose-400",
            !achieved && !missed && "bg-[var(--accent)]",
          )}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function GoalModal({
  form,
  staff,
  unitName,
  submitting,
  error,
  onClose,
  onChange,
  onSubmit,
}: {
  form: GoalFormState;
  staff: ApiUser[];
  unitName: string;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onChange: React.Dispatch<React.SetStateAction<GoalFormState>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 md:items-center">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-50">
              Definir nova meta
            </h2>
            <p className="mt-1 text-xs text-zinc-500">{unitName}</p>
          </div>
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
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "UNIT", label: "Unidade" },
                { id: "PROFESSIONAL", label: "Profissional" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  onChange((current) => ({ ...current, scope: item.id }))
                }
                className={cn(
                  "rounded-xl px-3 py-2.5 text-sm font-semibold ring-1 transition",
                  form.scope === item.id
                    ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]"
                    : "bg-zinc-900 text-zinc-400 ring-zinc-800",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {form.scope === "PROFESSIONAL" ? (
            <Field label="Profissional">
              <select
                required
                value={form.professionalId}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    professionalId: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none"
              >
                <option value="">Selecione</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Período">
              <select
                value={form.period}
                onChange={(event) => {
                  const period = event.target.value as ApiGoalPeriod;
                  const range = periodRange(period);
                  onChange((current) => ({
                    ...current,
                    period,
                    startDate: range.startDate,
                    endDate: range.endDate,
                  }));
                }}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none"
              >
                <option value="MONTHLY">Mensal</option>
                <option value="WEEKLY">Semanal</option>
              </select>
            </Field>
            <Field label="Valor alvo (R$)">
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={form.targetAmount}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    targetAmount: event.target.value,
                  }))
                }
                placeholder="10000"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Início">
              <input
                required
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none"
              />
            </Field>
            <Field label="Fim">
              <input
                required
                type="date"
                value={form.endDate}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    endDate: event.target.value,
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
            {submitting ? "Salvando..." : "Cadastrar meta"}
          </button>
        </form>
      </div>
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
  icon: typeof Target;
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

function StatusBadge({ status }: { status: ApiGoalStatus }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        status === "COMPLETED" &&
          "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20",
        status === "ACTIVE" &&
          "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]",
        status === "MISSED" &&
          "bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20",
        status === "CANCELLED" &&
          "bg-zinc-800 text-zinc-400 ring-1 ring-zinc-700",
      )}
    >
      {status === "COMPLETED" ? <CheckCircle2 className="size-3" /> : null}
      {STATUS_LABELS[status]}
    </span>
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

function initialGoalForm(): GoalFormState {
  const range = periodRange("MONTHLY");

  return {
    scope: "UNIT",
    professionalId: "",
    period: "MONTHLY",
    targetAmount: "",
    startDate: range.startDate,
    endDate: range.endDate,
  };
}

function periodRange(period: ApiGoalPeriod) {
  const now = new Date();

  if (period === "WEEKLY") {
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = new Date(now);
    start.setDate(now.getDate() + mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      startDate: toDateInputValue(start),
      endDate: toDateInputValue(end),
    };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateInputToIso(value: string, bound: "start" | "end") {
  const time = bound === "start" ? "T00:00:00.000" : "T23:59:59.999";
  return new Date(`${value}${time}`).toISOString();
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
