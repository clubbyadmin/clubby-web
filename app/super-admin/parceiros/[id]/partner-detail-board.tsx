"use client";

import { ErrorState, LoadingState } from "@/components/api-state";
import {
  BUSINESS_TYPE_LABELS,
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
  type ApiPartnerContract,
  type ApiPlatformPlan,
  type ApiPlatformTenant,
} from "@/services/api";
import {
  ArrowLeft,
  FileText,
  Mail,
  Printer,
  Save,
  ScrollText,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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

export function PartnerDetailBoard({ partnerId }: { partnerId: string }) {
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
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getSuperAdminTenant(partnerId);
      applyTenant(response);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [applyTenant, partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function fillAddressFromCep(raw: string) {
    const digits = digitsOnly(raw);
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

      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}
      {notice ? <p className="mb-4 text-sm text-emerald-300">{notice}</p> : null}
      {invitePassword ? (
        <p className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          Senha temporária (copie agora):{" "}
          <span className="font-mono font-semibold">{invitePassword}</span>
        </p>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Mensalidade" value={formatCurrency(tenant.platformFee)} />
        <Stat label="Completude" value={`${score}%`} />
        <Stat label="Usuários" value={String(tenant.counts?.users ?? 0)} />
        <Stat label="Serviços" value={String(tenant.counts?.services ?? 0)} />
      </div>

      {tenant.completeness?.missing?.length ? (
        <Section title="O que falta no cadastro">
          <ul className="space-y-1 text-sm text-zinc-400">
            {tenant.completeness.missing.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      <form onSubmit={(event) => void handleSave(event)} className="mt-6 space-y-6">
        <Section title="Plano e mensalidade">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-zinc-400">
              Plano SaaS
              <select
                value={platformPlan}
                onChange={(event) =>
                  setPlatformPlan(event.target.value as ApiPlatformPlan)
                }
                className="mt-1 h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100"
              >
                {(Object.keys(PLAN_LABELS) as ApiPlatformPlan[]).map((plan) => (
                  <option key={plan} value={plan}>
                    {PLAN_LABELS[plan]}
                  </option>
                ))}
              </select>
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

        <Section title="Verticais ativas no mesmo estabelecimento">
          <p className="mb-3 text-xs text-zinc-500">
            Microempreendedor multi-serviço: ligue Unhas + Estética + Barbearia
            no mesmo tenant.
          </p>
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

        <Section title="Responsável / 1º acesso">
          <p className="mb-3 text-xs text-zinc-500">
            Convite envia e-mail com senha temporária e exige troca no primeiro
            login. Status: {tenant.inviteStatus ?? "—"}.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome do responsável" value={ownerName} onChange={setOwnerName} />
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
            <Field label="Número" value={number} onChange={setNumber} required={false} />
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
            {saving ? "Salvando..." : "Salvar ficha"}
          </button>
        </div>
      </form>

      <div className="mt-6">
        <Section title="Contratos">
          <div className="space-y-2">
            {(tenant.contracts ?? []).length === 0 ? (
              <p className="text-sm text-zinc-500">
                Nenhum contrato emitido. Use “Gerar contrato” para criar a minuta
                com os dados atuais.
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
      </div>

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h3 className="mb-4 text-sm font-semibold text-zinc-100">{title}</h3>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = true,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  readOnly?: boolean;
}) {
  return (
    <label className="text-xs text-zinc-400">
      {label}
      <input
        type={type}
        required={required}
        readOnly={readOnly}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "mt-1 h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100",
          readOnly && "opacity-70",
        )}
      />
    </label>
  );
}
