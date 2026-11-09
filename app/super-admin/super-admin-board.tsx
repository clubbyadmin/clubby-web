"use client";

import {
  BUSINESS_TYPES,
} from "@/lib/business-type";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/mock-data";
import {
  api,
  getErrorMessage,
  type ApiPlatformMetrics,
  type ApiPlatformTenant,
} from "@/services/api";
import {
  ArrowRight,
  Building2,
  CircleDollarSign,
  ClipboardList,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

export function SuperAdminBoard() {
  const [tenants, setTenants] = useState<ApiPlatformTenant[]>([]);
  const [metrics, setMetrics] = useState<ApiPlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [tenantList, platformMetrics] = await Promise.all([
      api.getSuperAdminTenants(),
      api.getSuperAdminMetrics(),
    ]);
    setTenants(tenantList);
    setMetrics(platformMetrics);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .catch((requestError: unknown) => {
        if (!cancelled) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const pending = tenants.filter((item) => item.status === "PENDING");
  const lowCompleteness = tenants
    .filter((item) => (item.completeness?.score ?? 0) < 70)
    .slice(0, 5);
  const maxBusinessType = useMemo(() => {
    if (!metrics) return 1;
    return Math.max(1, ...Object.values(metrics.tenants.byBusinessType));
  }, [metrics]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Visão geral
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
            Plataforma Clubby
          </h2>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">
            Acompanhe a rede e abra o centro de controle de cada parceiro.
          </p>
        </div>
        <Link
          href="/super-admin/parceiros"
          className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-2.5 text-sm font-semibold text-zinc-950"
        >
          <Building2 className="size-4" />
          Ir para Parceiros
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="MRR da plataforma"
          value={metrics ? formatCurrency(metrics.platformRevenue.mrr) : "—"}
          hint={
            metrics
              ? `${metrics.platformRevenue.billedTenants} matrizes ativas`
              : "Assinaturas Clubby"
          }
          icon={CircleDollarSign}
        />
        <Kpi
          label="ARR consolidado"
          value={metrics ? formatCurrency(metrics.platformRevenue.arr) : "—"}
          hint="Receita anualizada de SaaS"
          icon={Wallet}
        />
        <Kpi
          label="Estabelecimentos"
          value={metrics ? String(metrics.tenants.total) : "—"}
          hint={
            pending.length > 0
              ? `${pending.length} aguardando aprovação`
              : "Rede Clubby"
          }
          icon={Store}
        />
        <Kpi
          label="Agenda 30 dias"
          value={
            metrics ? String(metrics.operations.appointmentsLast30Days) : "—"
          }
          hint={
            metrics
              ? `${metrics.operations.completedAppointmentsLast30Days} concluídos`
              : "Volume da rede"
          }
          icon={Users}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Link
          href="/super-admin/parceiros"
          className="group rounded-3xl border border-amber-400/25 bg-gradient-to-br from-amber-400/10 to-transparent p-5 transition hover:border-amber-300/40"
        >
          <div className="flex items-center justify-between">
            <Building2 className="size-5 text-amber-300" />
            <ArrowRight className="size-4 text-amber-200/70 transition group-hover:translate-x-0.5" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-zinc-50">Parceiros</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Ficha completa: plano, verticais, invite, contrato e completude.
          </p>
          <p className="mt-4 text-xs font-semibold text-amber-200">
            {loading ? "…" : `${tenants.length} estabelecimentos`}
          </p>
        </Link>

        <Link
          href="/super-admin/whatsapp"
          className="group rounded-3xl border border-zinc-800 bg-zinc-950/60 p-5 transition hover:border-zinc-700"
        >
          <div className="flex items-center justify-between">
            <ClipboardList className="size-5 text-zinc-300" />
            <ArrowRight className="size-4 text-zinc-500 transition group-hover:translate-x-0.5" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-zinc-50">WhatsApp</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Saúde da conexão do bot em cada estabelecimento.
          </p>
        </Link>

        <Link
          href="/super-admin/financeiro"
          className="group rounded-3xl border border-zinc-800 bg-zinc-950/60 p-5 transition hover:border-zinc-700"
        >
          <div className="flex items-center justify-between">
            <Wallet className="size-5 text-zinc-300" />
            <ArrowRight className="size-4 text-zinc-500 transition group-hover:translate-x-0.5" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-zinc-50">Financeiro</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Volume da rede, MRR e auditoria dos parceiros.
          </p>
        </Link>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/60 p-5">
          <h3 className="text-sm font-semibold text-zinc-200">
            Segmentação por tipo de negócio
          </h3>
          <div className="mt-5 space-y-3">
            {BUSINESS_TYPES.map((item) => {
              const count = metrics?.tenants.byBusinessType[item.id] ?? 0;
              const width = `${(count / maxBusinessType) * 100}%`;
              return (
                <div key={item.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">{item.label}</span>
                    <span className="font-medium text-zinc-200">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
                    <div
                      className="h-full rounded-full"
                      style={{ width, background: item.accent }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/60 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-200">Atenção</h3>
            <Link
              href="/super-admin/parceiros"
              className="text-xs font-semibold text-amber-300 hover:text-amber-200"
            >
              Ver todos
            </Link>
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <StatusRow
              label="Pendentes de aprovação"
              value={pending.length}
              tone="text-amber-300"
            />
            <StatusRow
              label="Ativos"
              value={metrics?.tenants.ACTIVE ?? 0}
              tone="text-emerald-300"
            />
            <StatusRow
              label="Inadimplentes"
              value={metrics?.tenants.PAST_DUE ?? 0}
              tone="text-red-300"
            />
          </dl>
          {lowCompleteness.length > 0 ? (
            <div className="mt-5 border-t border-zinc-800 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Completude baixa
              </p>
              <ul className="mt-3 space-y-2">
                {lowCompleteness.map((tenant) => (
                  <li key={tenant.id}>
                    <Link
                      href={`/super-admin/parceiros/${tenant.id}`}
                      className="flex items-center justify-between rounded-xl px-2 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50"
                    >
                      <span>{tenant.name}</span>
                      <span className="text-xs text-zinc-500">
                        {tenant.completeness?.score ?? 0}%
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
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

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-zinc-500">{label}</dt>
      <dd className={cn("font-semibold", tone)}>{value}</dd>
    </div>
  );
}
