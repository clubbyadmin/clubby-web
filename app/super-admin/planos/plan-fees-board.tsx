"use client";

import {
  api,
  getErrorMessage,
  type ApiPlatformPlan,
} from "@/services/api";
import { Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const ORDER: ApiPlatformPlan[] = ["SOLO", "ESSENCIAL", "CRESCIMENTO", "REDE"];

export function PlanFeesBoard() {
  const [labels, setLabels] = useState<Record<ApiPlatformPlan, string> | null>(
    null,
  );
  const [fees, setFees] = useState<Record<ApiPlatformPlan, string>>({
    SOLO: "97",
    ESSENCIAL: "197",
    CRESCIMENTO: "297",
    REDE: "497",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getSuperAdminPlanFees();
      setLabels(response.labels);
      setFees({
        SOLO: String(response.fees.SOLO),
        ESSENCIAL: String(response.fees.ESSENCIAL),
        CRESCIMENTO: String(response.fees.CRESCIMENTO),
        REDE: String(response.fees.REDE),
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload = Object.fromEntries(
        ORDER.map((plan) => [plan, Number(fees[plan])]),
      ) as Record<ApiPlatformPlan, number>;
      const response = await api.updateSuperAdminPlanFees(payload);
      setFees({
        SOLO: String(response.fees.SOLO),
        ESSENCIAL: String(response.fees.ESSENCIAL),
        CRESCIMENTO: String(response.fees.CRESCIMENTO),
        REDE: String(response.fees.REDE),
      });
      setNotice(
        "Valores salvos. Na ficha do parceiro, ao trocar o plano a mensalidade sugere esse valor.",
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
          Comercial
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-zinc-50">
          Planos e mensalidades
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Defina o valor padrão de cada plano. Cada parceiro ainda pode ter
          mensalidade customizada na ficha.
        </p>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {notice}
        </p>
      ) : null}

      <form
        onSubmit={(event) => void handleSave(event)}
        className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-5"
      >
        {loading ? (
          <p className="text-sm text-zinc-500">Carregando planos...</p>
        ) : (
          <div className="space-y-3">
            {ORDER.map((plan) => (
              <label
                key={plan}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
              >
                <span className="text-sm font-medium text-zinc-100">
                  {labels?.[plan] ?? plan}
                </span>
                <span className="flex items-center gap-2 text-xs text-zinc-500">
                  R$
                  <input
                    required
                    inputMode="decimal"
                    value={fees[plan]}
                    onChange={(event) =>
                      setFees((current) => ({
                        ...current,
                        [plan]: event.target.value,
                      }))
                    }
                    className="h-10 w-28 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100"
                  />
                </span>
              </label>
            ))}
          </div>
        )}
        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={saving || loading}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-300 px-5 text-sm font-semibold text-zinc-950 disabled:opacity-60"
          >
            <Save className="size-4" />
            {saving ? "Salvando..." : "Salvar valores"}
          </button>
        </div>
      </form>
    </div>
  );
}
