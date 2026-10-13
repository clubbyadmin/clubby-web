"use client";

import { ClientAreaNav } from "@/components/client-area-nav";
import { ErrorState, LoadingState } from "@/components/api-state";
import { AccentIconWrap } from "@/components/shell/accent-ui";
import { PageHeader } from "@/components/page-header";
import { useTenant } from "@/contexts/tenant-context";
import {
  readPaymentMethod,
  writePaymentMethod,
  type StoredPaymentMethod,
} from "@/lib/customer-profile";
import { formatCurrency } from "@/lib/mock-data";
import {
  api,
  getErrorMessage,
  type ApiSubscriptionMember,
} from "@/services/api";
import {
  CalendarClock,
  Check,
  CreditCard,
  Crown,
  Infinity,
  Percent,
  Sparkles,
  Ticket,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const ADVANCE_BOOKING_DAYS = 7;

export function PlanBoard() {
  const { tenant } = useTenant();
  const tenantId = tenant.id === "local" ? undefined : tenant.id;
  const [member, setMember] = useState<ApiSubscriptionMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<StoredPaymentMethod | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [draft, setDraft] = useState<StoredPaymentMethod | null>(null);

  const loadPlan = useCallback(async () => {
    if (!tenantId) {
      setMember(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profile = await api.getCustomerProfile({ tenantId });
      const members = await api.getSubscriptionMembers({
        tenantId,
        customerId: profile.user.id,
        status: "ACTIVE",
      });
      setMember(members[0] ?? null);
      setPayment(readPaymentMethod(tenantId));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const benefits = useMemo(() => {
    const included = member?.plan.includedServices ?? [];
    const items = included.map((item) => {
      const unlimited = item.quantityPerCycle >= 99;
      return {
        title: item.label,
        detail: unlimited
          ? "100% off · ilimitado no ciclo"
          : `${item.quantityPerCycle}× por ciclo · 100% off`,
        icon: unlimited ? Infinity : Ticket,
      };
    });

    items.push({
      title: "Agenda antecipada",
      detail: `Agenda liberada com ${ADVANCE_BOOKING_DAYS} dias de antecedência`,
      icon: CalendarClock,
    });
    items.push({
      title: "Prioridade no salão",
      detail: "Encaixes e horários nobres para membros do clube",
      icon: Sparkles,
    });

    return items;
  }, [member]);

  function openPayment() {
    setDraft(payment);
    setPaymentOpen(true);
  }

  function savePayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantId || !draft) {
      return;
    }

    const last4 = draft.last4.replace(/\D/g, "").slice(-4);
    if (last4.length !== 4) {
      return;
    }

    const next = { ...draft, last4 };
    writePaymentMethod(tenantId, next);
    setPayment(next);
    setPaymentOpen(false);
  }

  if (loading) {
    return (
      <div className="relative flex flex-1 flex-col px-5 pb-8 pt-8">
        <PageHeader
          title="Meu plano"
          subtitle="Clube de assinatura"
          backHref="/cliente"
        />
        <LoadingState message="Carregando seu plano..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex flex-1 flex-col px-5 pb-8 pt-8">
        <PageHeader
          title="Meu plano"
          subtitle="Clube de assinatura"
          backHref="/cliente"
        />
        <ErrorState message={error} onRetry={() => void loadPlan()} />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="relative flex flex-1 flex-col px-5 pb-8 pt-8">
        <PageHeader
          title="Meu plano"
          subtitle="Clube de assinatura"
          backHref="/cliente"
        />
        <ClientAreaNav />
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 text-center">
          <Crown className="mx-auto size-8 text-[var(--accent)]" />
          <p className="mt-3 text-sm text-zinc-300">
            Você ainda não tem um plano ativo neste estabelecimento.
          </p>
          <Link
            href="/agendar"
            className="mt-4 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-zinc-950"
          >
            Agendar avulso
          </Link>
        </div>
      </div>
    );
  }

  const monthly = monthlyEquivalent(
    Number(member.plan.price),
    member.plan.intervalDays,
  );
  const periodStart = new Date(member.currentPeriodStart).toLocaleDateString(
    "pt-BR",
  );
  const periodEnd = new Date(member.currentPeriodEnd).toLocaleDateString(
    "pt-BR",
  );

  return (
    <div className="relative flex flex-1 flex-col px-5 pb-8 pt-8">
      <PageHeader
        title="Meu plano"
        subtitle="Benefícios, vigência e pagamento"
        backHref="/cliente"
      />
      <ClientAreaNav />

      <article className="overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-gradient-to-br from-[color-mix(in_srgb,var(--accent)_16%,transparent)] via-zinc-900 to-zinc-950 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--accent)]">
              Plano ativo
            </p>
            <h2 className="mt-1 text-xl font-bold text-zinc-50">
              {member.plan.name}
            </h2>
          </div>
          <AccentIconWrap className="size-11">
            <Crown className="size-5" />
          </AccentIconWrap>
        </div>
        {member.plan.description ? (
          <p className="mt-3 text-sm leading-relaxed text-zinc-300">
            {member.plan.description}
          </p>
        ) : null}
        <dl className="mt-5 grid grid-cols-2 gap-3">
          <InfoTile label="Vigência" value={`${periodStart} → ${periodEnd}`} />
          <InfoTile
            label="Valor mensal"
            value={formatCurrency(monthly)}
          />
        </dl>
        <p className="mt-3 text-xs text-zinc-500">
          {member.creditsRemaining} crédito
          {member.creditsRemaining === 1 ? "" : "s"} restante
          {member.creditsRemaining === 1 ? "" : "s"} neste ciclo
        </p>
      </article>

      <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-zinc-950 text-[var(--accent)] ring-1 ring-zinc-800">
              <CreditCard className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-zinc-100">
                {payment?.brand} •••• {payment?.last4}
              </p>
              <p className="text-xs text-zinc-500">
                {payment?.holder} · {payment?.expiry}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openPayment}
            className="min-h-11 rounded-xl border border-zinc-800 px-3 text-xs font-semibold text-zinc-200"
          >
            Alterar
          </button>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          Benefícios inclusos
        </h2>
        <ul className="space-y-2">
          {benefits.map((item) => (
            <li
              key={item.title}
              className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"
            >
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)]">
                <item.icon className="size-4" strokeWidth={2.2} />
              </span>
              <span>
                <span className="block text-sm font-medium text-zinc-100">
                  {item.title}
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  {item.detail}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
          <Percent className="size-3.5" />
          Serviços fora do pacote seguem a tabela do salão, com desconto de membro.
        </p>
      </section>

      {paymentOpen && draft ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 md:items-center">
          <form
            onSubmit={savePayment}
            className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-50">
                Alterar método de pagamento
              </h3>
              <button
                type="button"
                onClick={() => setPaymentOpen(false)}
                className="rounded-xl border border-zinc-800 p-2 text-zinc-400"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>
            <label className="mb-3 block">
              <span className="mb-1.5 block text-[11px] uppercase tracking-wide text-zinc-500">
                Bandeira
              </span>
              <select
                value={draft.brand}
                onChange={(event) =>
                  setDraft({ ...draft, brand: event.target.value })
                }
                className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100"
              >
                {["Visa", "Mastercard", "Elo", "Amex"].map((brand) => (
                  <option key={brand}>{brand}</option>
                ))}
              </select>
            </label>
            <label className="mb-3 block">
              <span className="mb-1.5 block text-[11px] uppercase tracking-wide text-zinc-500">
                Final do cartão
              </span>
              <input
                required
                inputMode="numeric"
                maxLength={4}
                value={draft.last4}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    last4: event.target.value.replace(/\D/g, "").slice(0, 4),
                  })
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100"
              />
            </label>
            <label className="mb-3 block">
              <span className="mb-1.5 block text-[11px] uppercase tracking-wide text-zinc-500">
                Nome impresso
              </span>
              <input
                required
                value={draft.holder}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    holder: event.target.value.toUpperCase(),
                  })
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100"
              />
            </label>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-[11px] uppercase tracking-wide text-zinc-500">
                Validade
              </span>
              <input
                required
                placeholder="MM/AA"
                value={draft.expiry}
                onChange={(event) =>
                  setDraft({ ...draft, expiry: event.target.value })
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100"
              />
            </label>
            <button
              type="submit"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] text-sm font-semibold text-zinc-950"
            >
              <Check className="size-4" />
              Salvar cartão
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-950/50 px-3 py-3 ring-1 ring-white/5">
      <dt className="text-[10px] uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-zinc-50">{value}</dd>
    </div>
  );
}

function monthlyEquivalent(price: number, intervalDays: number) {
  if (!intervalDays) {
    return price;
  }
  return (price * 30) / intervalDays;
}
