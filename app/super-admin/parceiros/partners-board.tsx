"use client";

import {
  BUSINESS_TYPES,
  TENANT_STATUS_LABELS,
  type BusinessType,
} from "@/lib/business-type";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/mock-data";
import type { TenantLifecycleStatus, TenantVertical } from "@/lib/tenant-types";
import {
  api,
  getErrorMessage,
  type ApiPlatformPlan,
  type ApiPlatformTenant,
} from "@/services/api";
import {
  Building2,
  ChevronRight,
  KeyRound,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const STATUS_STYLE: Record<TenantLifecycleStatus, string> = {
  PENDING: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
  ACTIVE: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25",
  SUSPENDED: "bg-zinc-800 text-zinc-400 ring-zinc-700",
  PAST_DUE: "bg-red-400/10 text-red-300 ring-red-400/25",
};

const PLAN_LABELS: Record<ApiPlatformPlan, string> = {
  SOLO: "Solo",
  ESSENCIAL: "Essencial",
  CRESCIMENTO: "Crescimento",
  REDE: "Rede",
};

const VERTICAL_LABELS: Record<TenantVertical, string> = {
  BARBER: "Barbearia",
  BEAUTY: "Beleza",
  NAILS: "Unhas",
  CLINIC: "Estética",
};

export function PartnersBoard() {
  const router = useRouter();
  const [tenants, setTenants] = useState<ApiPlatformTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<ApiPlatformTenant | null>(null);
  const [resetResult, setResetResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setTenants(await api.getSuperAdminTenants());
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

  useEffect(() => {
    if (!menuId) return;
    const close = () => setMenuId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuId]);

  async function changeStatus(id: string, status: TenantLifecycleStatus) {
    setBusyId(id);
    setError(null);
    try {
      await api.updateSuperAdminTenantStatus(id, status);
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyId(null);
    }
  }

  async function approve(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api.createSuperAdminTenant({ tenantId: id });
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword(tenant: ApiPlatformTenant, password?: string) {
    setBusyId(tenant.id);
    setError(null);
    try {
      const result = await api.resetSuperAdminTenantPassword(tenant.id, password);
      setResetResult(result.temporaryPassword);
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyId(null);
    }
  }

  function openFicha(id: string) {
    router.push(`/super-admin/parceiros/${id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Centro de controle
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
            Parceiros Clubby
          </h2>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">
            Abra a ficha de cada estabelecimento para plano, verticais, invite e
            contrato.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((open) => !open)}
          className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-zinc-950"
        >
          <Plus className="size-4" strokeWidth={2.2} />
          Novo parceiro
        </button>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {showCreate ? (
        <CreatePartnerForm
          onCancel={() => setShowCreate(false)}
          onCreated={async () => {
            setShowCreate(false);
            await load();
          }}
        />
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-950/60">
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-amber-300" strokeWidth={2} />
            <h3 className="text-sm font-semibold text-zinc-100">
              Estabelecimentos
            </h3>
          </div>
          <p className="text-xs text-zinc-500">
            {loading ? "Carregando..." : `${tenants.length} parceiros`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-medium">Estabelecimento</th>
                <th className="px-5 py-3 font-medium">Plano</th>
                <th className="px-5 py-3 font-medium">Verticais</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Completude</th>
                <th className="px-5 py-3 font-medium">Mensalidade</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => {
                const verticals = tenant.enabledVerticals?.length
                  ? tenant.enabledVerticals
                  : [tenant.vertical];
                const score = tenant.completeness?.score ?? 0;

                return (
                  <tr
                    key={tenant.id}
                    className="cursor-pointer border-t border-zinc-800/70 text-zinc-300 transition hover:bg-zinc-900/50"
                    onClick={() => openFicha(tenant.id)}
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-zinc-100">{tenant.name}</p>
                      <p className="text-xs text-zinc-500">
                        /{tenant.slug}
                        {tenant.city ? ` · ${tenant.city}` : ""}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-xs text-zinc-200">
                      {PLAN_LABELS[tenant.platformPlan ?? "ESSENCIAL"]}
                    </td>
                    <td className="px-5 py-4 text-xs text-zinc-400">
                      {verticals
                        .map((item) => VERTICAL_LABELS[item] ?? item)
                        .join(" · ")}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                          STATUS_STYLE[tenant.status],
                        )}
                      >
                        {TENANT_STATUS_LABELS[tenant.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-amber-300"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-300">{score}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      {formatCurrency(tenant.platformFee)}
                    </td>
                    <td
                      className="px-5 py-4 text-right"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {tenant.status === "PENDING" ? (
                        <button
                          type="button"
                          disabled={busyId === tenant.id}
                          onClick={() => void approve(tenant.id)}
                          className="rounded-full bg-amber-300 px-3 py-1.5 text-xs font-semibold text-zinc-950 disabled:opacity-60"
                        >
                          Aprovar
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openFicha(tenant.id)}
                            className="inline-flex items-center gap-1 rounded-full bg-amber-300/15 px-3 py-1.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/25 hover:bg-amber-300/25"
                          >
                            Abrir ficha
                            <ChevronRight className="size-3.5" />
                          </button>
                          <div className="relative inline-flex">
                            <button
                              type="button"
                              disabled={busyId === tenant.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                setMenuId((current) =>
                                  current === tenant.id ? null : tenant.id,
                                );
                              }}
                              className="inline-flex items-center rounded-full border border-zinc-700 p-1.5 text-zinc-400 hover:text-zinc-100 disabled:opacity-60"
                              aria-label="Mais ações"
                            >
                              <MoreHorizontal className="size-3.5" />
                            </button>
                            {menuId === tenant.id ? (
                              <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 py-1 shadow-xl shadow-black/40">
                                <ActionItem
                                  icon={KeyRound}
                                  label="Resetar senha"
                                  onClick={() => {
                                    setMenuId(null);
                                    setResetResult(null);
                                    setResetTarget(tenant);
                                  }}
                                />
                                {tenant.status !== "SUSPENDED" ? (
                                  <ActionItem
                                    label="Suspender"
                                    onClick={() => {
                                      setMenuId(null);
                                      void changeStatus(tenant.id, "SUSPENDED");
                                    }}
                                  />
                                ) : null}
                                {tenant.status !== "PAST_DUE" ? (
                                  <ActionItem
                                    label="Marcar inadimplente"
                                    tone="text-red-300"
                                    onClick={() => {
                                      setMenuId(null);
                                      void changeStatus(tenant.id, "PAST_DUE");
                                    }}
                                  />
                                ) : null}
                                {tenant.status !== "ACTIVE" ? (
                                  <ActionItem
                                    label="Reativar"
                                    tone="text-emerald-300"
                                    onClick={() => {
                                      setMenuId(null);
                                      void changeStatus(tenant.id, "ACTIVE");
                                    }}
                                  />
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && tenants.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-zinc-500">
              Nenhum estabelecimento cadastrado.
            </p>
          ) : null}
        </div>
      </section>

      {resetTarget ? (
        <ResetPasswordModal
          tenant={resetTarget}
          busy={busyId === resetTarget.id}
          generatedPassword={resetResult}
          onClose={() => {
            setResetTarget(null);
            setResetResult(null);
          }}
          onConfirm={(password) => void resetPassword(resetTarget, password)}
        />
      ) : null}
    </div>
  );
}

function CreatePartnerForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<BusinessType>("BARBER_SHOP");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [document, setDocument] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("clubby-admin");
  const [platformFee, setPlatformFee] = useState("197");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createSuperAdminTenant({
        name,
        slug,
        document,
        whatsappNumber,
        businessType,
        ownerName,
        ownerEmail,
        ownerPhone,
        ownerPassword,
        platformFee: Number(platformFee),
      });
      await onCreated();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="rounded-3xl border border-amber-400/20 bg-amber-400/5 p-5"
    >
      <h3 className="text-sm font-semibold text-zinc-100">
        Novo parceiro (já aprovado)
      </h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs text-zinc-400">
          Tipo
          <select
            value={businessType}
            onChange={(event) =>
              setBusinessType(event.target.value as BusinessType)
            }
            className="mt-1 h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100"
          >
            {BUSINESS_TYPES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <TextField label="Nome" value={name} onChange={setName} />
        <TextField label="Slug" value={slug} onChange={setSlug} />
        <TextField label="Documento" value={document} onChange={setDocument} />
        <TextField
          label="WhatsApp"
          value={whatsappNumber}
          onChange={setWhatsappNumber}
        />
        <TextField
          label="Mensalidade (R$)"
          value={platformFee}
          onChange={setPlatformFee}
        />
        <TextField label="Responsável" value={ownerName} onChange={setOwnerName} />
        <TextField
          label="E-mail"
          type="email"
          value={ownerEmail}
          onChange={setOwnerEmail}
        />
        <TextField label="Telefone" value={ownerPhone} onChange={setOwnerPhone} />
        <TextField
          label="Senha inicial"
          type="password"
          value={ownerPassword}
          onChange={setOwnerPassword}
        />
      </div>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
        >
          {submitting ? "Salvando..." : "Criar e ativar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-4 py-2 text-sm text-zinc-400"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="text-xs text-zinc-400">
      {label}
      <input
        type={type}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100"
      />
    </label>
  );
}

function ActionItem({
  label,
  onClick,
  icon: Icon,
  tone,
}: {
  label: string;
  onClick: () => void;
  icon?: typeof KeyRound;
  tone?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-zinc-300 hover:bg-zinc-900",
        tone,
      )}
    >
      {Icon ? <Icon className="size-3.5" /> : null}
      {label}
    </button>
  );
}

function ResetPasswordModal({
  tenant,
  busy,
  generatedPassword,
  onClose,
  onConfirm,
}: {
  tenant: ApiPlatformTenant;
  busy: boolean;
  generatedPassword: string | null;
  onClose: () => void;
  onConfirm: (password?: string) => void;
}) {
  const [password, setPassword] = useState("");

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-zinc-50">Resetar senha</h3>
        <p className="mt-2 text-sm text-zinc-500">
          Gestor de {tenant.name}
          {tenant.owner?.email ? ` · ${tenant.owner.email}` : ""}.
        </p>
        {generatedPassword ? (
          <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-amber-200/80">
              Senha temporária
            </p>
            <p className="mt-1 font-mono text-lg text-amber-100">
              {generatedPassword}
            </p>
          </div>
        ) : (
          <label className="mt-4 block text-xs text-zinc-400">
            Senha (opcional)
            <input
              type="text"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100"
            />
          </label>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm text-zinc-400"
          >
            {generatedPassword ? "Fechar" : "Cancelar"}
          </button>
          {!generatedPassword ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onConfirm(password.trim() || undefined)}
              className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
            >
              {busy ? "Redefinindo..." : "Resetar senha"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
