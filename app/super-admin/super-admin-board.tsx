"use client";

import {
  BUSINESS_TYPE_LABELS,
  BUSINESS_TYPES,
  TENANT_STATUS_LABELS,
  type BusinessType,
} from "@/lib/business-type";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/mock-data";
import type { TenantLifecycleStatus } from "@/lib/tenant-types";
import {
  api,
  getErrorMessage,
  type ApiPlatformMetrics,
  type ApiPlatformTenant,
} from "@/services/api";
import {
  Building2,
  CircleDollarSign,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const STATUS_STYLE: Record<TenantLifecycleStatus, string> = {
  PENDING: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
  ACTIVE: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25",
  SUSPENDED: "bg-zinc-800 text-zinc-400 ring-zinc-700",
  PAST_DUE: "bg-red-400/10 text-red-300 ring-red-400/25",
};

export function SuperAdminBoard() {
  const [tenants, setTenants] = useState<ApiPlatformTenant[]>([]);
  const [metrics, setMetrics] = useState<ApiPlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ApiPlatformTenant | null>(null);
  const [resetTarget, setResetTarget] = useState<ApiPlatformTenant | null>(null);
  const [resetResult, setResetResult] = useState<string | null>(null);

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

  useEffect(() => {
    if (!menuId) {
      return;
    }

    const close = () => setMenuId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuId]);

  const pendingCount = tenants.filter((item) => item.status === "PENDING").length;
  const maxBusinessType = useMemo(() => {
    if (!metrics) {
      return 1;
    }

    return Math.max(1, ...Object.values(metrics.tenants.byBusinessType));
  }, [metrics]);

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
      const result = await api.resetSuperAdminTenantPassword(
        tenant.id,
        password,
      );
      setResetResult(result.temporaryPassword);
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Visão macro
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
            Operação da plataforma
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((open) => !open)}
          className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-zinc-950"
        >
          <Plus className="size-4" strokeWidth={2.2} />
          Aprovar parceiro
        </button>
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
          hint={pendingCount > 0 ? `${pendingCount} aguardando aprovação` : "Rede Clubby"}
          icon={Store}
        />
        <Kpi
          label="Agenda 30 dias"
          value={metrics ? String(metrics.operations.appointmentsLast30Days) : "—"}
          hint={
            metrics
              ? `${metrics.operations.completedAppointmentsLast30Days} concluídos${
                  metrics.conversionRate != null
                    ? ` · ${(metrics.conversionRate * 100).toFixed(1).replace(".", ",")}% conversão`
                    : ""
                }`
              : "Volume da rede"
          }
          icon={Users}
        />
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
          <h3 className="text-sm font-semibold text-zinc-200">Status da rede</h3>
          <dl className="mt-5 space-y-4 text-sm">
            <StatusRow label="Ativos" value={metrics?.tenants.ACTIVE ?? 0} tone="text-emerald-300" />
            <StatusRow label="Pendentes" value={metrics?.tenants.PENDING ?? 0} tone="text-amber-300" />
            <StatusRow label="Suspensos" value={metrics?.tenants.SUSPENDED ?? 0} tone="text-zinc-400" />
            <StatusRow label="Inadimplentes" value={metrics?.tenants.PAST_DUE ?? 0} tone="text-red-300" />
            <StatusRow
              label="Equipe na rede"
              value={metrics?.operations.staffCount ?? 0}
              tone="text-zinc-200"
            />
          </dl>
        </div>
      </section>

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
            <h3 className="text-sm font-semibold text-zinc-100">Clientes Clubby</h3>
          </div>
          <p className="text-xs text-zinc-500">
            {loading ? "Carregando..." : `${tenants.length} estabelecimentos`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-medium">Estabelecimento</th>
                <th className="px-5 py-3 font-medium">Tipo</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Assinatura</th>
                <th className="px-5 py-3 font-medium">Operação</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr
                  key={tenant.id}
                  className="border-t border-zinc-800/70 text-zinc-300"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-zinc-100">{tenant.name}</p>
                    <p className="text-xs text-zinc-500">
                      /{tenant.slug}
                      {tenant.city ? ` · ${tenant.city}` : ""}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-xs">
                    {BUSINESS_TYPE_LABELS[tenant.businessType]}
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
                  <td className="px-5 py-4 text-xs">
                    {formatCurrency(tenant.platformFee)}
                    {tenant.isHeadquarters ? "" : " · filial"}
                  </td>
                  <td className="px-5 py-4 text-xs text-zinc-500">
                    {tenant.counts?.users ?? 0} usuários ·{" "}
                    {tenant.counts?.appointments ?? 0} agendamentos
                  </td>
                  <td className="px-5 py-4 text-right">
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
                      <div className="relative inline-flex justify-end">
                        <button
                          type="button"
                          disabled={busyId === tenant.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            setMenuId((current) =>
                              current === tenant.id ? null : tenant.id,
                            );
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-zinc-100 disabled:opacity-60"
                        >
                          Ações
                          <MoreHorizontal className="size-3.5" />
                        </button>
                        {menuId === tenant.id ? (
                          <div
                            onClick={(event) => event.stopPropagation()}
                            className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 py-1 shadow-xl shadow-black/40"
                          >
                            <ActionItem
                              icon={Pencil}
                              label="Editar cadastro"
                              onClick={() => {
                                setMenuId(null);
                                setEditing(tenant);
                              }}
                            />
                            <ActionItem
                              icon={KeyRound}
                              label="Resetar senha do gestor"
                              onClick={() => {
                                setMenuId(null);
                                setResetResult(null);
                                setResetTarget(tenant);
                              }}
                            />
                            {tenant.status !== "SUSPENDED" ? (
                              <ActionItem
                                label="Suspender acesso"
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
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && tenants.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-zinc-500">
              Nenhum estabelecimento cadastrado.
            </p>
          ) : null}
        </div>
      </section>

      {editing ? (
        <EditPartnerModal
          tenant={editing}
          busy={busyId === editing.id}
          onClose={() => setEditing(null)}
          onSave={async (payload) => {
            setBusyId(editing.id);
            setError(null);
            try {
              await api.updateSuperAdminTenant(editing.id, payload);
              setEditing(null);
              await load();
            } catch (requestError) {
              setError(getErrorMessage(requestError));
            } finally {
              setBusyId(null);
            }
          }}
        />
      ) : null}

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
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="text-xs text-zinc-400">
      {label}
      <input
        type={type}
        required={required}
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
  icon?: typeof Pencil;
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

function EditPartnerModal({
  tenant,
  busy,
  onClose,
  onSave,
}: {
  tenant: ApiPlatformTenant;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    document: string;
    whatsappNumber: string;
    platformFee: number;
    zipCode?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(tenant.name);
  const [document, setDocument] = useState(tenant.document);
  const [whatsappNumber, setWhatsappNumber] = useState(tenant.whatsappNumber);
  const [platformFee, setPlatformFee] = useState(String(tenant.platformFee));
  const [zipCode, setZipCode] = useState(tenant.zipCode ?? "");
  const [street, setStreet] = useState(tenant.street ?? "");
  const [number, setNumber] = useState(tenant.number ?? "");
  const [neighborhood, setNeighborhood] = useState(tenant.neighborhood ?? "");
  const [city, setCity] = useState(tenant.city ?? "");
  const [state, setState] = useState(tenant.state ?? "");

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onSave({
            name,
            document,
            whatsappNumber,
            platformFee: Number(platformFee),
            zipCode,
            street,
            number,
            neighborhood,
            city,
            state,
          });
        }}
        className="w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Cadastro
            </p>
            <h3 className="mt-1 text-lg font-semibold text-zinc-50">
              Editar {tenant.name}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-xs text-zinc-500">
            Fechar
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <TextField label="Nome" value={name} onChange={setName} />
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
          <TextField label="CEP" value={zipCode} onChange={setZipCode} required={false} />
          <TextField label="Rua" value={street} onChange={setStreet} required={false} />
          <TextField label="Número" value={number} onChange={setNumber} required={false} />
          <TextField
            label="Bairro"
            value={neighborhood}
            onChange={setNeighborhood}
            required={false}
          />
          <TextField label="Cidade" value={city} onChange={setCity} required={false} />
          <TextField label="UF" value={state} onChange={setState} required={false} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm text-zinc-400">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
          >
            {busy ? "Salvando..." : "Salvar cadastro"}
          </button>
        </div>
      </form>
    </div>
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
          {tenant.owner?.email ? ` · ${tenant.owner.email}` : ""}. A senha atual
          deixa de funcionar imediatamente.
        </p>
        {generatedPassword ? (
          <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-amber-200/80">
              Senha temporária
            </p>
            <p className="mt-1 font-mono text-lg text-amber-100">{generatedPassword}</p>
            <p className="mt-2 text-xs text-zinc-400">
              Copie agora. Ela não será exibida de novo.
            </p>
          </div>
        ) : (
          <label className="mt-4 block text-xs text-zinc-400">
            Senha (opcional — geramos uma se ficar em branco)
            <input
              type="text"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100"
            />
          </label>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm text-zinc-400">
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
