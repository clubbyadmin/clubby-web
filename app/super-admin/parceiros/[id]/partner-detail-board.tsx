"use client";

import { ErrorState, LoadingState } from "@/components/api-state";
import {
  BUSINESS_TYPES,
  TENANT_STATUS_LABELS,
  type BusinessType,
} from "@/lib/business-type";
import { cn } from "@/lib/cn";
import {
  digitsOnly,
  formatCep,
  lookupCep,
} from "@/lib/customer-profile";
import { formatCurrency } from "@/lib/mock-data";
import type { TenantLifecycleStatus, TenantVertical } from "@/lib/tenant-types";
import {
  api,
  getErrorMessage,
  type ApiPartnerCompletenessStep,
  type ApiPartnerCompletenessStepId,
  type ApiPartnerContract,
  type ApiPlatformPlan,
  type ApiPlatformTenant,
} from "@/services/api";
import {
  ArrowLeft,
  FileText,
  Mail,
  MessageCircle,
  Printer,
  Save,
  ScrollText,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PartnerMigrationPanel } from "./partner-migration-panel";
import { Field, Section, Stat } from "./partner-shared";
import { PartnerWhatsappPanel } from "./partner-whatsapp-panel";

const STATUS_STYLE: Record<TenantLifecycleStatus, string> = {
  PENDING: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
  ACTIVE: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25",
  SUSPENDED: "bg-zinc-800 text-zinc-400 ring-zinc-700",
  PAST_DUE: "bg-red-400/10 text-red-300 ring-red-400/25",
};

const CONTRACT_STYLE: Record<string, string> = {
  ISSUED: "text-amber-300",
  ACCEPTED: "text-emerald-300",
  CANCELLED: "text-zinc-500",
  DRAFT: "text-zinc-400",
};

const PLAN_LABELS: Record<ApiPlatformPlan, string> = {
  SOLO: "Solo (MEI / autônomo)",
  ESSENCIAL: "Essencial",
  CRESCIMENTO: "Crescimento",
  REDE: "Rede",
};

const VERTICAL_OPTIONS: Array<{ id: TenantVertical; label: string }> = [
  { id: "BARBER", label: "Barbearia" },
  { id: "BEAUTY", label: "Beleza / salão" },
  { id: "NAILS", label: "Unhas" },
  { id: "CLINIC", label: "Estética / clínica" },
];

type PartnerTab =
  | "visao"
  | "cadastro"
  | "plano"
  | "whatsapp"
  | "contratos"
  | "migracao";

const TABS: Array<{ id: PartnerTab; label: string; step: string }> = [
  { id: "visao", label: "Visão geral", step: "1" },
  { id: "cadastro", label: "Cadastro", step: "2" },
  { id: "plano", label: "Plano e módulos", step: "3" },
  { id: "whatsapp", label: "WhatsApp", step: "4" },
  { id: "contratos", label: "Contratos", step: "5" },
  { id: "migracao", label: "Migração", step: "6" },
];

export function PartnerDetailBoard({ partnerId }: { partnerId: string }) {
  const [tab, setTab] = useState<PartnerTab>("visao");
  const [tenant, setTenant] = useState<ApiPlatformTenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [invitePassword, setInvitePassword] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [platformFee, setPlatformFee] = useState("");
  const [platformPlan, setPlatformPlan] = useState<ApiPlatformPlan>("ESSENCIAL");
  const [businessType, setBusinessType] = useState<BusinessType>("BARBER_SHOP");
  const [enabledVerticals, setEnabledVerticals] = useState<TenantVertical[]>([
    "BARBER",
  ]);
  const [features, setFeatures] = useState({
    membershipClub: true,
    inventory: true,
    financial: true,
  });
  const [status, setStatus] = useState<TenantLifecycleStatus>("PENDING");
  const [zipCode, setZipCode] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [lookingCep, setLookingCep] = useState(false);
  const [cepHint, setCepHint] = useState<string | null>(null);
  const [lastLookedCep, setLastLookedCep] = useState("");
  const [planFees, setPlanFees] = useState<Record<ApiPlatformPlan, number> | null>(
    null,
  );
  const [apiOutdated, setApiOutdated] = useState(false);

  const applyTenant = useCallback((response: ApiPlatformTenant) => {
    setTenant(response);
    setName(response.name);
    setDocument(response.document);
    setWhatsappNumber(response.whatsappNumber);
    setPlatformFee(String(response.platformFee));
    setPlatformPlan(response.platformPlan ?? "ESSENCIAL");
    setBusinessType(response.businessType);
    setEnabledVerticals(
      response.enabledVerticals?.length
        ? response.enabledVerticals
        : [response.vertical],
    );
    setFeatures({
      membershipClub: response.features?.membershipClub ?? true,
      inventory: response.features?.inventory ?? true,
      financial: response.features?.financial ?? true,
    });
    setStatus(response.status);
    setZipCode(formatCep(response.zipCode ?? ""));
    setStreet(response.street ?? "");
    setNumber(response.number ?? "");
    setNeighborhood(response.neighborhood ?? "");
    setCity(response.city ?? "");
    setState(response.state ?? "");
    setOwnerName(response.owner?.name ?? "");
    setOwnerEmail(response.owner?.email ?? "");
    setOwnerPhone(response.owner?.phone ?? "");
    setApiOutdated(
      response.completeness == null || response.platformPlan == null,
    );
  }, []);

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) {
      setLoading(true);
    }
    setError(null);
    try {
      const [response, fees] = await Promise.all([
        api.getSuperAdminTenant(partnerId),
        api.getSuperAdminPlanFees().catch(() => null),
      ]);
      applyTenant(response);
      if (fees) {
        setPlanFees(fees.fees);
      } else {
        setApiOutdated(true);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      if (!opts?.soft) {
        setLoading(false);
      }
    }
  }, [applyTenant, partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function fillAddressFromCep(rawCep: string) {
    const digits = digitsOnly(rawCep);
    if (digits.length !== 8 || digits === lastLookedCep) {
      return;
    }
    setLookingCep(true);
    setCepHint("Buscando endereço...");
    try {
      const address = await lookupCep(digits);
      setLastLookedCep(digits);
      if (!address) {
        setCepHint("CEP não encontrado. Preencha o endereço manualmente.");
        return;
      }
      setStreet(address.street);
      setNeighborhood(address.neighborhood);
      setCity(address.city);
      setState(address.state);
      setCepHint("Endereço preenchido pelo CEP.");
    } catch {
      setCepHint("Não foi possível consultar o CEP agora.");
    } finally {
      setLookingCep(false);
    }
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.updateSuperAdminTenant(partnerId, {
        name,
        document,
        whatsappNumber,
        platformFee: Number(platformFee),
        platformPlan,
        businessType,
        enabledVerticals,
        features,
        status,
        zipCode: digitsOnly(zipCode),
        street,
        number,
        neighborhood,
        city,
        state,
        ownerName,
        ownerEmail,
        ownerPhone,
      });
      applyTenant(updated);
      setNotice("Ficha salva.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function inviteOwner() {
    setSaving(true);
    setError(null);
    setNotice(null);
    setInvitePassword(null);
    try {
      const result = await api.inviteSuperAdminTenant(partnerId);
      setNotice(result.message);
      if (result.temporaryPassword) {
        setInvitePassword(result.temporaryPassword);
      }
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function issueContract() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const contract = await api.issueSuperAdminPartnerContract(partnerId);
      setPreviewHtml(contract.bodyHtml ?? null);
      setNotice(`Contrato ${contract.version} emitido.`);
      setTab("contratos");
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function openContract(contract: ApiPartnerContract) {
    setError(null);
    try {
      const full = await api.getSuperAdminPartnerContract(partnerId, contract.id);
      setPreviewHtml(full.bodyHtml ?? null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function acceptContract(contractId: string) {
    setSaving(true);
    setError(null);
    try {
      await api.acceptSuperAdminPartnerContract(partnerId, contractId, {
        acceptedByName: ownerName,
        acceptedByEmail: ownerEmail,
      });
      setNotice("Aceite do contrato registrado.");
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  function toggleVertical(vertical: TenantVertical) {
    setEnabledVerticals((current) => {
      if (current.includes(vertical)) {
        if (current.length === 1) {
          return current;
        }
        return current.filter((item) => item !== vertical);
      }
      return [...current, vertical];
    });
  }

  const missingHints = useMemo(() => {
    const missing = tenant?.completeness?.missing ?? [];
    return missing.map((item) => {
      const lower = item.toLowerCase();
      let target: PartnerTab = "cadastro";
      if (lower.includes("contrato")) target = "contratos";
      else if (
        lower.includes("whatsapp") ||
        lower.includes("bot") ||
        lower.includes("serviço") ||
        lower.includes("servico")
      )
        target = "whatsapp";
      else if (lower.includes("cliente") || lower.includes("base"))
        target = "migracao";
      else if (
        lower.includes("vertical") ||
        lower.includes("plano") ||
        lower.includes("equipe")
      )
        target = "plano";
      return { label: item, target };
    });
  }, [tenant?.completeness?.missing]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-10">
        <LoadingState message="Carregando centro de controle..." />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-10">
        <ErrorState
          title="Cliente não encontrado"
          message={error ?? "Não foi possível abrir este estabelecimento."}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  const score = tenant.completeness?.score ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/super-admin"
            className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-300"
          >
            <ArrowLeft className="size-3.5" />
            Voltar para Clientes Clubby
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold text-zinc-50">{tenant.name}</h2>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                STATUS_STYLE[tenant.status],
              )}
            >
              {TENANT_STATUS_LABELS[tenant.status]}
            </span>
            <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-zinc-200">
              {PLAN_LABELS[tenant.platformPlan ?? "ESSENCIAL"]}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            /{tenant.slug} · Completude {score}%
            {tenant.city ? ` · ${tenant.city}/${tenant.state}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void inviteOwner()}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-700 px-4 text-sm font-semibold text-zinc-100 disabled:opacity-60"
          >
            <Mail className="size-4" />
            Convidar / reenviar acesso
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void issueContract()}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-amber-300 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-60"
          >
            <ScrollText className="size-4" />
            Gerar contrato
          </button>
        </div>
      </div>

      {apiOutdated ? (
        <p className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          A API de produção ainda não foi atualizada. Plano, completude e invite
          só funcionam depois do rebuild no Lightsail.
        </p>
      ) : null}
      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}
      {notice ? <p className="mb-4 text-sm text-emerald-300">{notice}</p> : null}
      {invitePassword ? (
        <p className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          Senha temporária (copie agora):{" "}
          <span className="font-mono font-semibold">{invitePassword}</span>
        </p>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-5">
        <Stat label="Mensalidade" value={formatCurrency(tenant.platformFee)} />
        <Stat label="Completude" value={`${score}%`} />
        <Stat label="Usuários" value={String(tenant.counts?.users ?? 0)} />
        <Stat label="Clientes" value={String(tenant.counts?.clients ?? 0)} />
        <Stat label="Serviços" value={String(tenant.counts?.services ?? 0)} />
      </div>

      <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((item) => {
          const stepPct = stepScoreByTab(tenant, item.id).score;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition",
                tab === item.id
                  ? "bg-amber-300 text-zinc-950"
                  : "border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-100",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-5 items-center justify-center rounded-full text-[10px]",
                  tab === item.id
                    ? "bg-zinc-950/15 text-zinc-950"
                    : "bg-zinc-800 text-zinc-400",
                )}
              >
                {item.step}
              </span>
              {item.label}
              <span
                className={cn(
                  "tabular-nums",
                  tab === item.id ? "text-zinc-950/70" : "text-zinc-500",
                )}
              >
                {stepPct}%
              </span>
            </button>
          );
        })}
      </nav>

      {tab === "visao" ? (
        <div className="space-y-5">
          <Section
            title="Passo a passo do onboarding"
            description="Use as sub-telas para configurar o parceiro completo em um só lugar."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {TABS.filter((item) => item.id !== "visao").map((item) => {
                const step = stepScoreByTab(tenant, item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-left transition hover:border-amber-400/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                          Passo {item.step}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-zinc-100">
                          {item.label}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
                          step.score >= 100
                            ? "bg-emerald-400/15 text-emerald-300"
                            : step.score >= 50
                              ? "bg-amber-300/15 text-amber-200"
                              : "bg-zinc-800 text-zinc-300",
                        )}
                      >
                        {step.score}%
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          step.score >= 100
                            ? "bg-emerald-400"
                            : step.score >= 50
                              ? "bg-amber-300"
                              : "bg-zinc-500",
                        )}
                        style={{ width: `${Math.min(100, Math.max(0, step.score))}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-zinc-500">
                      {step.done}/{step.total} itens
                      {step.missing[0] ? ` · falta: ${step.missing[0]}` : " · completo"}
                    </p>
                  </button>
                );
              })}
            </div>
          </Section>

          {missingHints.length ? (
            <Section title="O que falta no cadastro">
              <ul className="space-y-2">
                {missingHints.map((item) => (
                  <li key={item.label}>
                    <button
                      type="button"
                      onClick={() => setTab(item.target)}
                      className="text-left text-sm text-zinc-300 hover:text-amber-300"
                    >
                      • {item.label}
                      <span className="ml-2 text-[11px] text-zinc-500">
                        ir para {TABS.find((tabItem) => tabItem.id === item.target)?.label}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          ) : (
            <Section title="Cadastro">
              <p className="text-sm text-emerald-300">
                Completude em 100%. Parceiro pronto para operação.
              </p>
            </Section>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setTab("whatsapp")}
              className="inline-flex items-center gap-3 rounded-3xl border border-zinc-800 bg-zinc-900/40 px-5 py-4 text-left"
            >
              <MessageCircle className="size-5 text-amber-300" />
              <span>
                <span className="block text-sm font-semibold text-zinc-100">
                  WhatsApp do cliente
                </span>
                <span className="text-xs text-zinc-500">
                  {tenant.whatsappConfig?.isActive
                    ? "Bot ativo"
                    : "Configurar conexão e automações"}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab("migracao")}
              className="inline-flex items-center gap-3 rounded-3xl border border-zinc-800 bg-zinc-900/40 px-5 py-4 text-left"
            >
              <Upload className="size-5 text-amber-300" />
              <span>
                <span className="block text-sm font-semibold text-zinc-100">
                  Migrar base de clientes
                </span>
                <span className="text-xs text-zinc-500">
                  Importar CSV de concorrentes
                </span>
              </span>
            </button>
          </div>
        </div>
      ) : null}

      {tab === "cadastro" ? (
        <form onSubmit={(event) => void handleSave(event)} className="space-y-5">
          <Section title="Estabelecimento">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome" value={name} onChange={setName} />
              <Field label="Documento" value={document} onChange={setDocument} />
              <Field
                label="WhatsApp cadastrado"
                value={whatsappNumber}
                onChange={setWhatsappNumber}
              />
              <label className="text-xs text-zinc-400">
                Tipo de negócio (âncora)
                <select
                  value={businessType}
                  onChange={(event) =>
                    setBusinessType(event.target.value as BusinessType)
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100"
                >
                  {BUSINESS_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                label="Slug (vitrine)"
                value={tenant.slug}
                onChange={() => undefined}
                readOnly
              />
            </div>
          </Section>

          <Section
            title="Responsável / 1º acesso"
            description={`Convite envia senha temporária. Status: ${tenant.inviteStatus ?? "—"}.`}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Nome do responsável"
                value={ownerName}
                onChange={setOwnerName}
              />
              <Field
                label="E-mail de acesso"
                value={ownerEmail}
                onChange={setOwnerEmail}
                type="email"
              />
              <Field
                label="Telefone do responsável"
                value={ownerPhone}
                onChange={setOwnerPhone}
              />
            </div>
          </Section>

          <Section title="Endereço">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-zinc-400">
                CEP
                <input
                  value={zipCode}
                  inputMode="numeric"
                  onChange={(event) => {
                    const next = formatCep(event.target.value);
                    setZipCode(next);
                    setCepHint(null);
                    if (digitsOnly(next).length === 8) {
                      void fillAddressFromCep(next);
                    }
                  }}
                  onBlur={() => void fillAddressFromCep(zipCode)}
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100"
                />
                <span className="mt-1 block text-[11px] text-zinc-500">
                  {lookingCep ? "Buscando endereço..." : cepHint}
                </span>
              </label>
              <Field label="Rua" value={street} onChange={setStreet} required={false} />
              <Field
                label="Número"
                value={number}
                onChange={setNumber}
                required={false}
              />
              <Field
                label="Bairro"
                value={neighborhood}
                onChange={setNeighborhood}
                required={false}
              />
              <Field label="Cidade" value={city} onChange={setCity} required={false} />
              <Field label="UF" value={state} onChange={setState} required={false} />
            </div>
          </Section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-300 px-5 text-sm font-semibold text-zinc-950 disabled:opacity-60"
            >
              <Save className="size-4" />
              {saving ? "Salvando..." : "Salvar cadastro"}
            </button>
          </div>
        </form>
      ) : null}

      {tab === "plano" ? (
        <form onSubmit={(event) => void handleSave(event)} className="space-y-5">
          <Section title="Plano e mensalidade">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-zinc-400">
                Plano SaaS
                <select
                  value={platformPlan}
                  onChange={(event) => {
                    const next = event.target.value as ApiPlatformPlan;
                    setPlatformPlan(next);
                    if (planFees?.[next] != null) {
                      setPlatformFee(String(planFees[next]));
                    }
                  }}
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100"
                >
                  {(Object.keys(PLAN_LABELS) as ApiPlatformPlan[]).map((plan) => (
                    <option key={plan} value={plan}>
                      {PLAN_LABELS[plan]}
                      {planFees?.[plan] != null ? ` · R$ ${planFees[plan]}` : ""}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[11px] text-zinc-500">
                  Valores padrão em{" "}
                  <a href="/super-admin/planos" className="text-amber-300">
                    Planos
                  </a>
                  .
                </span>
              </label>
              <Field
                label="Mensalidade (R$)"
                value={platformFee}
                onChange={setPlatformFee}
              />
              <label className="text-xs text-zinc-400">
                Status
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as TenantLifecycleStatus)
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100"
                >
                  {Object.entries(TENANT_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Section>

          <Section
            title="Verticais ativas"
            description="Ligue Unhas + Estética + Barbearia no mesmo tenant."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {VERTICAL_OPTIONS.map((option) => {
                const checked = enabledVerticals.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm",
                      checked
                        ? "border-amber-400/40 bg-amber-400/10 text-amber-100"
                        : "border-zinc-800 bg-zinc-950 text-zinc-300",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleVertical(option.id)}
                      className="size-4 accent-amber-300"
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </Section>

          <Section title="Módulos de produto">
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  ["membershipClub", "Clube / assinatura"],
                  ["inventory", "Estoque"],
                  ["financial", "Financeiro"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-200"
                >
                  <input
                    type="checkbox"
                    checked={features[key]}
                    onChange={(event) =>
                      setFeatures((current) => ({
                        ...current,
                        [key]: event.target.checked,
                      }))
                    }
                    className="size-4 accent-amber-300"
                  />
                  {label}
                </label>
              ))}
            </div>
          </Section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-300 px-5 text-sm font-semibold text-zinc-950 disabled:opacity-60"
            >
              <Save className="size-4" />
              {saving ? "Salvando..." : "Salvar plano"}
            </button>
          </div>
        </form>
      ) : null}

      {tab === "whatsapp" ? (
        <div className="space-y-4">
          <WhatsappStepChecklist
            tenant={tenant}
            partnerId={partnerId}
            onChanged={() => void load({ soft: true })}
          />
          <PartnerWhatsappPanel
            partnerId={partnerId}
            onChanged={() => void load({ soft: true })}
          />
        </div>
      ) : null}

      {tab === "contratos" ? (
        <Section title="Contratos">
          <div className="space-y-2">
            {(tenant.contracts ?? []).length === 0 ? (
              <p className="text-sm text-zinc-500">
                Nenhum contrato emitido. Use “Gerar contrato” no topo.
              </p>
            ) : (
              tenant.contracts?.map((contract) => (
                <div
                  key={contract.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-100">
                      {contract.title}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Versão {contract.version} ·{" "}
                      <span
                        className={
                          CONTRACT_STYLE[contract.status] ?? "text-zinc-400"
                        }
                      >
                        {contract.status}
                      </span>
                      {contract.acceptedAt
                        ? ` · aceite em ${new Date(contract.acceptedAt).toLocaleDateString("pt-BR")}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void openContract(contract)}
                      className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200"
                    >
                      <FileText className="size-3.5" />
                      Ver
                    </button>
                    {contract.status === "ISSUED" ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void acceptContract(contract.id)}
                        className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/30 disabled:opacity-60"
                      >
                        Registrar aceite
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </Section>
      ) : null}

      {tab === "migracao" ? (
        <PartnerMigrationPanel
          partnerId={partnerId}
          onChanged={() => void load()}
        />
      ) : null}

      {previewHtml ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="flex h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-zinc-700 bg-zinc-950">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
              <p className="text-sm font-semibold text-zinc-100">
                Pré-visualização do contrato
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const popup = window.open("", "_blank");
                    if (popup) {
                      popup.document.write(previewHtml);
                      popup.document.close();
                      popup.focus();
                      popup.print();
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-300 px-3 py-1.5 text-xs font-semibold text-zinc-950"
                >
                  <Printer className="size-3.5" />
                  Imprimir / PDF
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewHtml(null)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-zinc-400"
                >
                  Fechar
                </button>
              </div>
            </div>
            <iframe
              title="Contrato"
              srcDoc={previewHtml}
              className="min-h-0 flex-1 bg-white"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WhatsappStepChecklist({
  tenant,
  partnerId,
  onChanged,
}: {
  tenant: ApiPlatformTenant;
  partnerId: string;
  onChanged: () => void;
}) {
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);
  const botOk = Boolean(tenant.whatsappConfig?.isActive);
  const serviceOk = (tenant.counts?.services ?? 0) > 0;

  async function seedServices() {
    setSeeding(true);
    setSeedError(null);
    setSeedNotice(null);
    try {
      const result = await api.applyServiceTemplates(partnerId);
      setSeedNotice(
        result.created.length > 0
          ? `${result.created.length} serviços de exemplo criados. O passo WhatsApp sobe quando o bot também estiver ativo.`
          : "Os serviços de exemplo já existiam neste salão.",
      );
      onChanged();
    } catch (requestError) {
      setSeedError(getErrorMessage(requestError));
    } finally {
      setSeeding(false);
    }
  }

  return (
    <Section title="Checklist do passo WhatsApp">
      <p className="mb-3 text-sm text-zinc-400">
        Este passo não usa a base de clientes (isso fica em Migração). Aqui
        entram só o bot conectado e ao menos um serviço no catálogo — sem
        serviço o cliente não consegue agendar.
      </p>
      <ul className="space-y-2 text-sm">
        <li className={botOk ? "text-emerald-300" : "text-amber-200"}>
          {botOk ? "✓" : "○"} Bot WhatsApp conectado
        </li>
        <li className={serviceOk ? "text-emerald-300" : "text-amber-200"}>
          {serviceOk ? "✓" : "○"} Ao menos um serviço no catálogo
          {!serviceOk ? (
            <span className="ml-1 text-zinc-500">
              (é isso que segura o passo em 50% se o bot já estiver ok)
            </span>
          ) : null}
        </li>
      </ul>
      {!serviceOk ? (
        <button
          type="button"
          disabled={seeding}
          onClick={() => void seedServices()}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-2 text-xs font-semibold text-zinc-950 disabled:opacity-60"
        >
          {seeding ? "Criando..." : "Criar serviços de exemplo"}
        </button>
      ) : null}
      {seedNotice ? (
        <p className="mt-3 text-sm text-emerald-300">{seedNotice}</p>
      ) : null}
      {seedError ? <p className="mt-3 text-sm text-red-300">{seedError}</p> : null}
    </Section>
  );
}

const STEP_CHECK_KEYS: Record<ApiPartnerCompletenessStepId, string[]> = {
  cadastro: [
    "document",
    "whatsappNumber",
    "address",
    "ownerEmail",
    "ownerPhone",
    "status",
  ],
  plano: ["verticals", "staff"],
  whatsapp: ["whatsappBot", "service"],
  contratos: ["contract"],
  migracao: ["clients"],
};

function stepScoreByTab(
  tenant: ApiPlatformTenant,
  tab: PartnerTab,
): Pick<ApiPartnerCompletenessStep, "score" | "done" | "total" | "missing"> {
  if (tab === "visao") {
    return {
      score: tenant.completeness?.score ?? 0,
      done: 0,
      total: 0,
      missing: [],
    };
  }

  const fromApi = tenant.completeness?.steps?.find((step) => step.id === tab);
  if (fromApi) {
    return fromApi;
  }

  const keys = STEP_CHECK_KEYS[tab];
  const checks = (tenant.completeness?.checks ?? []).filter((check) =>
    keys.includes(check.key),
  );

  if (checks.length > 0) {
    const done = checks.filter((check) => check.ok).length;
    return {
      score: Math.round((done / checks.length) * 100),
      done,
      total: checks.length,
      missing: checks.filter((check) => !check.ok).map((check) => check.label),
    };
  }

  // Fallback local se a API ainda não expõe steps/checks.
  const local = localStepChecks(tenant, tab);
  const done = local.filter((item) => item.ok).length;
  return {
    score: local.length === 0 ? 0 : Math.round((done / local.length) * 100),
    done,
    total: local.length,
    missing: local.filter((item) => !item.ok).map((item) => item.label),
  };
}

function localStepChecks(tenant: ApiPlatformTenant, tab: Exclude<PartnerTab, "visao">) {
  if (tab === "cadastro") {
    return [
      { ok: Boolean(tenant.document?.trim()), label: "Documento (CNPJ/CPF)" },
      {
        ok: Boolean(tenant.whatsappNumber?.trim()),
        label: "WhatsApp cadastrado",
      },
      {
        ok: Boolean(
          tenant.zipCode?.trim() &&
            tenant.street?.trim() &&
            tenant.number?.trim() &&
            tenant.neighborhood?.trim() &&
            tenant.city?.trim() &&
            tenant.state?.trim(),
        ),
        label: "Endereço completo",
      },
      {
        ok: Boolean(tenant.owner?.email?.trim()),
        label: "E-mail do responsável",
      },
      {
        ok: Boolean(tenant.owner?.phone?.trim()),
        label: "Telefone do responsável",
      },
      {
        ok: tenant.status !== "PENDING",
        label: "Estabelecimento aprovado",
      },
    ];
  }

  if (tab === "plano") {
    const checks = [
      {
        ok: (tenant.enabledVerticals?.length ?? 0) > 0,
        label: "Ao menos uma vertical ativa",
      },
    ];
    if (tenant.platformPlan !== "SOLO") {
      checks.push({
        ok: (tenant.counts?.users ?? 0) >= 2,
        label: "Equipe além do gestor",
      });
    }
    return checks;
  }

  if (tab === "whatsapp") {
    return [
      {
        ok: Boolean(tenant.whatsappConfig?.isActive),
        label: "Bot WhatsApp conectado",
      },
      {
        ok: (tenant.counts?.services ?? 0) > 0,
        label: "Ao menos um serviço",
      },
    ];
  }

  if (tab === "contratos") {
    return [
      {
        ok: (tenant.contracts ?? []).some((item) => item.status === "ACCEPTED"),
        label: "Contrato SaaS aceito",
      },
    ];
  }

  return [
    {
      ok: (tenant.counts?.clients ?? 0) > 0,
      label: "Base de clientes iniciada",
    },
  ];
}
