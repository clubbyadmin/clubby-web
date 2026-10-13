"use client";

import { TENANT_STATUS_LABELS } from "@/lib/business-type";
import { cn } from "@/lib/cn";
import type { TenantLifecycleStatus } from "@/lib/tenant-types";
import {
  api,
  getErrorMessage,
  type ApiWhatsappHealth,
  type ApiWhatsappNetworkStatus,
} from "@/services/api";
import { MessageCircle, Radio, ShieldAlert, WifiOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const HEALTH_LABEL: Record<ApiWhatsappHealth, string> = {
  HEALTHY: "Saudável",
  DEGRADED: "Degradado",
  DISCONNECTED: "Desconectado",
  ERROR: "Erro",
  NOT_CONFIGURED: "Não configurado",
};

const HEALTH_STYLE: Record<ApiWhatsappHealth, string> = {
  HEALTHY: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25",
  DEGRADED: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
  DISCONNECTED: "bg-zinc-800 text-zinc-400 ring-zinc-700",
  ERROR: "bg-red-400/10 text-red-300 ring-red-400/25",
  NOT_CONFIGURED: "bg-zinc-900 text-zinc-500 ring-zinc-800",
};

const STATUS_STYLE: Record<TenantLifecycleStatus, string> = {
  PENDING: "text-amber-300",
  ACTIVE: "text-emerald-300",
  SUSPENDED: "text-zinc-500",
  PAST_DUE: "text-red-300",
};

export function SuperAdminWhatsappBoard() {
  const [data, setData] = useState<ApiWhatsappNetworkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setData(await api.getSuperAdminWhatsappStatus());
  }, []);

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

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
          Mensageria
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
          Saúde do WhatsApp
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Status técnico das instâncias da rede nas últimas 24 horas.
        </p>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi
          label="Saudáveis"
          value={data?.summary.HEALTHY ?? 0}
          icon={Radio}
          tone="text-emerald-300"
        />
        <Kpi
          label="Degradados"
          value={data?.summary.DEGRADED ?? 0}
          icon={ShieldAlert}
          tone="text-amber-300"
        />
        <Kpi
          label="Erro"
          value={data?.summary.ERROR ?? 0}
          icon={ShieldAlert}
          tone="text-red-300"
        />
        <Kpi
          label="Desconectados"
          value={data?.summary.DISCONNECTED ?? 0}
          icon={WifiOff}
          tone="text-zinc-400"
        />
        <Kpi
          label="Sem config"
          value={data?.summary.NOT_CONFIGURED ?? 0}
          icon={MessageCircle}
          tone="text-zinc-500"
        />
      </section>

      <section className="overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-950/60">
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4">
          <h3 className="text-sm font-semibold text-zinc-100">
            Conexões por tenant
          </h3>
          <p className="text-xs text-zinc-500">
            {loading ? "Carregando..." : `${data?.summary.total ?? 0} estabelecimentos`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-medium">Tenant</th>
                <th className="px-5 py-3 font-medium">Provedor</th>
                <th className="px-5 py-3 font-medium">Instância</th>
                <th className="px-5 py-3 font-medium">Último teste</th>
                <th className="px-5 py-3 font-medium">Falhas 24h</th>
                <th className="px-5 py-3 font-medium">Saúde</th>
              </tr>
            </thead>
            <tbody>
              {(data?.tenants ?? []).map((item) => (
                <tr
                  key={item.tenantId}
                  className="border-t border-zinc-800/70 text-zinc-300"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-zinc-100">{item.name}</p>
                    <p className="text-xs text-zinc-500">
                      /{item.slug} ·{" "}
                      <span className={STATUS_STYLE[item.tenantStatus]}>
                        {TENANT_STATUS_LABELS[item.tenantStatus]}
                      </span>
                    </p>
                  </td>
                  <td className="px-5 py-4 text-xs">
                    {item.provider ?? "—"}
                    {item.phoneNumber ? (
                      <p className="text-zinc-500">{item.phoneNumber}</p>
                    ) : null}
                  </td>
                  <td className="px-5 py-4 text-xs text-zinc-400">
                    {item.instanceName ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-xs text-zinc-400">
                    {item.lastTestAt
                      ? new Date(item.lastTestAt).toLocaleString("pt-BR")
                      : "Nunca"}
                    {item.lastError ? (
                      <p className="mt-1 max-w-xs truncate text-red-300" title={item.lastError}>
                        {item.lastError}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-5 py-4 text-xs tabular-nums">
                    {item.failedLast24h}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                        HEALTH_STYLE[item.health],
                      )}
                    >
                      {HEALTH_LABEL[item.health]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && (data?.tenants.length ?? 0) === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-zinc-500">
              Nenhum tenant para auditar.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Radio;
  tone: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </p>
        <Icon className={cn("size-4", tone)} strokeWidth={1.8} />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50">
        {value}
      </p>
    </div>
  );
}
