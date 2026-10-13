"use client";

import { AdminNav } from "@/components/admin-nav";
import { ErrorState, LoadingState } from "@/components/api-state";
import { AccentIconWrap } from "@/components/shell/accent-ui";
import { TenantBadge } from "@/components/tenant-brand";
import { useTenant } from "@/contexts/tenant-context";
import { cn } from "@/lib/cn";
import {
  api,
  getErrorMessage,
  type ApiAudiencePreview,
  type ApiCampaign,
  type ApiCampaignStatus,
  type ApiCampaignType,
  type ApiCoupon,
} from "@/services/api";
import {
  Cake,
  Gift,
  Loader2,
  Megaphone,
  Plus,
  Send,
  Sparkles,
  Ticket,
  UserRoundX,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type CampaignDraft = {
  message: string;
  filterValue: string;
  couponId: string;
};

type CouponFormState = {
  code: string;
  discountPercent: string;
  expirationDate: string;
  usageLimit: string;
};

const CAMPAIGN_PRESETS: Array<{
  type: Extract<ApiCampaignType, "INACTIVE_RECOVERY" | "BIRTHDAY" | "REFERRAL">;
  title: string;
  description: string;
  defaultMessage: string;
  defaultFilter: string;
  filterLabel: string;
  filterHint: string;
  icon: typeof Cake;
}> = [
  {
    type: "INACTIVE_RECOVERY",
    title: "Reativação de inativos",
    description:
      "Recupera clientes que não voltam há um tempo, sem vínculo de spam: só quem realmente sumiu da agenda.",
    defaultMessage:
      "Oi {{name}}! Faz um tempo que não te vemos no {{tenant}}. Que tal agendar um horário? Use o cupom {{coupon}} e ganhe {{discount}}% off.",
    defaultFilter: "30",
    filterLabel: "Dias sem visita",
    filterHint: "Gatilho: último atendimento concluído (ou cadastro, se nunca veio).",
    icon: UserRoundX,
  },
  {
    type: "BIRTHDAY",
    title: "Aniversariantes do mês",
    description:
      "Parabéns automático para quem faz aniversário no mês, com espaço para cupom de mimo.",
    defaultMessage:
      "Feliz aniversário, {{name}}! O {{tenant}} preparou um mimo: cupom {{coupon}} com {{discount}}% off neste mês.",
    defaultFilter: String(new Date().getMonth() + 1),
    filterLabel: "Mês do aniversário",
    filterHint: "1 = janeiro … 12 = dezembro. Use o mês atual para o disparo mensal.",
    icon: Cake,
  },
  {
    type: "REFERRAL",
    title: "Programa de indicação",
    description:
      "Ativa clientes fiéis para indicar amigos. O recorte é por quantidade de visitas concluídas.",
    defaultMessage:
      "Oi {{name}}! Você é cliente especial do {{tenant}}. Indique um amigo e usem o cupom {{coupon}} com {{discount}}% off.",
    defaultFilter: "3",
    filterLabel: "Visitas mínimas",
    filterHint: "Só entra quem já concluiu pelo menos esse número de atendimentos.",
    icon: Gift,
  },
];

const INITIAL_COUPON_FORM: CouponFormState = {
  code: "",
  discountPercent: "10",
  expirationDate: defaultExpirationDate(),
  usageLimit: "50",
};

const STATUS_LABELS: Record<ApiCampaignStatus, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativa",
  SENT: "Disparada",
};

const TYPE_LABELS: Record<ApiCampaignType, string> = {
  INACTIVE_RECOVERY: "Reativação",
  BIRTHDAY: "Aniversário",
  DISCOUNT_COUPON: "Cupom",
  REFERRAL: "Indicação",
};

export function MarketingBoard() {
  const { tenant, loading: tenantLoading } = useTenant();
  const tenantId = tenant.id === "local" ? undefined : tenant.id;

  const [campaigns, setCampaigns] = useState<ApiCampaign[]>([]);
  const [coupons, setCoupons] = useState<ApiCoupon[]>([]);
  const [drafts, setDrafts] = useState<Record<string, CampaignDraft>>(
    buildInitialDrafts(),
  );
  const [previews, setPreviews] = useState<
    Partial<Record<ApiCampaignType, ApiAudiencePreview>>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [couponForm, setCouponForm] =
    useState<CouponFormState>(INITIAL_COUPON_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyType, setBusyType] = useState<ApiCampaignType | null>(null);
  const [cardMessage, setCardMessage] = useState<
    Partial<Record<ApiCampaignType, { tone: "ok" | "error"; text: string }>>
  >({});

  const loadMarketingData = useCallback(async () => {
    if (!tenantId) {
      setCampaigns([]);
      setCoupons([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [campaignsResponse, couponsResponse] = await Promise.all([
        api.getCampaigns({ tenantId }),
        api.getCoupons({ tenantId }),
      ]);

      setCampaigns(campaignsResponse);
      setCoupons(couponsResponse);
      setDrafts((current) => hydrateDrafts(current, campaignsResponse));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setCampaigns([]);
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadMarketingData();
  }, [loadMarketingData]);

  const activeCoupons = useMemo(
    () => coupons.filter((coupon) => coupon.isActive),
    [coupons],
  );

  const availableCoupons = useMemo(
    () => coupons.filter((coupon) => coupon.isAvailable),
    [coupons],
  );

  const sentCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.status === "SENT"),
    [campaigns],
  );

  const activeCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.status === "ACTIVE"),
    [campaigns],
  );

  const hasLoaded = campaigns.length > 0 || coupons.length > 0;

  function updateDraft(
    type: ApiCampaignType,
    patch: Partial<CampaignDraft>,
  ) {
    setDrafts((current) => ({
      ...current,
      [type]: { ...current[type], ...patch },
    }));
  }

  async function handlePreview(type: ApiCampaignType) {
    if (!tenantId) {
      return;
    }

    const draft = drafts[type];
    const preset = CAMPAIGN_PRESETS.find((item) => item.type === type);
    if (!draft || !preset) {
      return;
    }

    setBusyType(type);
    setCardMessage((current) => ({ ...current, [type]: undefined }));

    try {
      const preview = await api.previewAudience({
        tenantId,
        type,
        ...audienceParams(type, draft),
      });
      setPreviews((current) => ({ ...current, [type]: preview }));
      setCardMessage((current) => ({
        ...current,
        [type]: {
          tone: "ok",
          text: `${preview.count} cliente${preview.count === 1 ? "" : "s"} no recorte atual.`,
        },
      }));
    } catch (requestError) {
      setCardMessage((current) => ({
        ...current,
        [type]: { tone: "error", text: getErrorMessage(requestError) },
      }));
    } finally {
      setBusyType(null);
    }
  }

  async function handleSaveCampaign(
    type: ApiCampaignType,
    options: { dispatch: boolean },
  ) {
    if (!tenantId) {
      setCardMessage((current) => ({
        ...current,
        [type]: {
          tone: "error",
          text: "Tenant indisponível. Recarregue o painel e tente novamente.",
        },
      }));
      return;
    }

    const preset = CAMPAIGN_PRESETS.find((item) => item.type === type);
    const draft = drafts[type];

    if (!preset || !draft) {
      return;
    }

    if (!draft.message.trim()) {
      setCardMessage((current) => ({
        ...current,
        [type]: { tone: "error", text: "Escreva a mensagem da campanha." },
      }));
      return;
    }

    const filter = Number(draft.filterValue);

    if (!Number.isInteger(filter) || filter < 1) {
      setCardMessage((current) => ({
        ...current,
        [type]: {
          tone: "error",
          text: `Informe um valor válido em “${preset.filterLabel}”.`,
        },
      }));
      return;
    }

    setBusyType(type);
    setCardMessage((current) => ({ ...current, [type]: undefined }));

    try {
      const created = await api.createCampaign({
        tenantId,
        title: preset.title,
        type,
        messageTemplate: draft.message.trim(),
        status: "ACTIVE",
        couponId: draft.couponId || null,
        targetAudience: audienceParams(type, draft),
      });

      let dispatchedCount: number | null = null;

      if (options.dispatch) {
        const dispatched = await api.dispatchCampaign(created.id);
        dispatchedCount = dispatched.count;
      }

      await loadMarketingData();

      setCardMessage((current) => ({
        ...current,
        [type]: {
          tone: "ok",
          text: options.dispatch
            ? `Gatilho disparado para ${dispatchedCount ?? 0} cliente${(dispatchedCount ?? 0) === 1 ? "" : "s"}.`
            : "Gatilho ativado. A campanha ficou disponível no histórico.",
        },
      }));
    } catch (requestError) {
      setCardMessage((current) => ({
        ...current,
        [type]: { tone: "error", text: getErrorMessage(requestError) },
      }));
    } finally {
      setBusyType(null);
    }
  }

  async function handleCreateCoupon(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tenantId) {
      setFormError("Tenant indisponível. Recarregue o painel e tente novamente.");
      return;
    }

    if (!couponForm.code.trim()) {
      setFormError("Informe o código do cupom.");
      return;
    }

    const discountPercent = Number(couponForm.discountPercent.replace(",", "."));

    if (
      !Number.isFinite(discountPercent) ||
      discountPercent <= 0 ||
      discountPercent > 100
    ) {
      setFormError("Informe um desconto entre 0 e 100%.");
      return;
    }

    if (!couponForm.expirationDate) {
      setFormError("Informe a validade do cupom.");
      return;
    }

    let usageLimit: number | null = null;

    if (couponForm.usageLimit.trim()) {
      usageLimit = Number(couponForm.usageLimit);

      if (!Number.isInteger(usageLimit) || usageLimit < 1) {
        setFormError("Limite de uso deve ser um inteiro maior que zero, ou vazio.");
        return;
      }
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await api.createCoupon({
        tenantId,
        code: couponForm.code.trim(),
        discountPercent,
        expirationDate: dateInputToIso(couponForm.expirationDate),
        usageLimit,
        isActive: true,
      });

      setCouponModalOpen(false);
      setCouponForm({
        ...INITIAL_COUPON_FORM,
        expirationDate: defaultExpirationDate(),
      });
      await loadMarketingData();
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
            Marketing e campanhas · {tenant.name}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setCouponForm({
              ...INITIAL_COUPON_FORM,
              expirationDate: defaultExpirationDate(),
            });
            setCouponModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
        >
          <Plus className="size-4" />
          Criar novo cupom
        </button>
      </header>

      <AdminNav className="mb-6 lg:hidden" />

      {tenantLoading || (loading && !hasLoaded) ? (
        <LoadingState message="Carregando campanhas e cupons..." />
      ) : !tenantId ? (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-6 text-center text-sm text-zinc-400">
          Não foi possível identificar o estabelecimento. Recarregue o painel
          para carregar o marketing.
        </p>
      ) : error && !hasLoaded ? (
        <ErrorState message={error} onRetry={() => void loadMarketingData()} />
      ) : (
        <>
          {error ? (
            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
              <button
                type="button"
                onClick={() => void loadMarketingData()}
                className="ml-2 underline"
              >
                Tentar novamente
              </button>
            </div>
          ) : null}

          <section className="grid gap-3 sm:grid-cols-3">
            <SummaryCard
              label="Campanhas ativas"
              value={String(activeCampaigns.length)}
              hint="Gatilhos ligados para retenção"
              icon={Zap}
            />
            <SummaryCard
              label="Cupons disponíveis"
              value={String(availableCoupons.length)}
              hint={`${activeCoupons.length} cadastrado${activeCoupons.length === 1 ? "" : "s"}`}
              icon={Ticket}
            />
            <SummaryCard
              label="Disparos feitos"
              value={String(sentCampaigns.length)}
              hint="Campanhas já enviadas"
              icon={Send}
            />
          </section>

          <section className="mt-8">
            <div className="mb-4 flex items-center gap-2">
              <Megaphone className="size-4 text-[var(--accent)]" />
              <h2 className="text-sm font-semibold text-zinc-100">
                Campanhas automatizadas
              </h2>
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              {CAMPAIGN_PRESETS.map((preset) => (
                <CampaignCard
                  key={preset.type}
                  preset={preset}
                  draft={drafts[preset.type]}
                  coupons={availableCoupons}
                  preview={previews[preset.type]}
                  busy={busyType === preset.type}
                  feedback={cardMessage[preset.type]}
                  latest={latestCampaign(campaigns, preset.type)}
                  onChange={(patch) => updateDraft(preset.type, patch)}
                  onPreview={() => void handlePreview(preset.type)}
                  onActivate={() =>
                    void handleSaveCampaign(preset.type, { dispatch: false })
                  }
                  onDispatch={() =>
                    void handleSaveCampaign(preset.type, { dispatch: true })
                  }
                />
              ))}
            </div>
          </section>

          <CouponsSection coupons={activeCoupons} />

          <HistorySection campaigns={campaigns} />
        </>
      )}

      {couponModalOpen ? (
        <CouponModal
          form={couponForm}
          submitting={submitting}
          error={formError}
          onClose={() => setCouponModalOpen(false)}
          onChange={setCouponForm}
          onSubmit={handleCreateCoupon}
        />
      ) : null}
    </div>
  );
}

function CampaignCard({
  preset,
  draft,
  coupons,
  preview,
  busy,
  feedback,
  latest,
  onChange,
  onPreview,
  onActivate,
  onDispatch,
}: {
  preset: (typeof CAMPAIGN_PRESETS)[number];
  draft: CampaignDraft;
  coupons: ApiCoupon[];
  preview?: ApiAudiencePreview;
  busy: boolean;
  feedback?: { tone: "ok" | "error"; text: string };
  latest: ApiCampaign | undefined;
  onChange: (patch: Partial<CampaignDraft>) => void;
  onPreview: () => void;
  onActivate: () => void;
  onDispatch: () => void;
}) {
  const Icon = preset.icon;

  return (
    <article className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AccentIconWrap className="size-11">
            <Icon className="size-5" strokeWidth={2.2} />
          </AccentIconWrap>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              {preset.title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              {preset.description}
            </p>
          </div>
        </div>
        {latest ? <StatusBadge status={latest.status} /> : null}
      </div>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          {preset.filterLabel}
        </span>
        {preset.type === "BIRTHDAY" ? (
          <select
            value={draft.filterValue}
            onChange={(event) => onChange({ filterValue: event.target.value })}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none"
          >
            {MONTH_OPTIONS.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="number"
            min="1"
            step="1"
            value={draft.filterValue}
            onChange={(event) => onChange({ filterValue: event.target.value })}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
          />
        )}
        <span className="mt-1.5 block text-[11px] text-zinc-500">
          {preset.filterHint}
        </span>
      </label>

      <label className="mt-3 block">
        <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          Cupom vinculado
        </span>
        <select
          value={draft.couponId}
          onChange={(event) => onChange({ couponId: event.target.value })}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none"
        >
          <option value="">Sem cupom</option>
          {coupons.map((coupon) => (
            <option key={coupon.id} value={coupon.id}>
              {coupon.code} · {coupon.discountPercent}%
            </option>
          ))}
        </select>
      </label>

      <label className="mt-3 block flex-1">
        <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          Mensagem
        </span>
        <textarea
          rows={5}
          value={draft.message}
          onChange={(event) => onChange({ message: event.target.value })}
          className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
        />
        <span className="mt-1.5 block text-[11px] text-zinc-500">
          Variáveis: {"{{name}}"}, {"{{tenant}}"}, {"{{coupon}}"}, {"{{discount}}"}
        </span>
      </label>

      {preview ? (
        <p className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-400">
          Público atual:{" "}
          <span className="font-semibold text-[var(--accent)]">
            {preview.count}
          </span>
          {preview.recipients[0]
            ? ` · ex.: ${preview.recipients
                .slice(0, 2)
                .map((item) => item.name)
                .join(", ")}`
            : " · ninguém no recorte"}
        </p>
      ) : null}

      {feedback ? (
        <p
          className={cn(
            "mt-3 rounded-xl px-3 py-2 text-xs",
            feedback.tone === "ok"
              ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
              : "border border-red-500/20 bg-red-500/10 text-red-200",
          )}
        >
          {feedback.text}
        </p>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={onPreview}
          disabled={busy}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 px-3 py-2.5 text-xs font-semibold text-zinc-200 hover:border-zinc-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5 text-[var(--accent)]" />}
          Prévia
        </button>
        <button
          type="button"
          onClick={onActivate}
          disabled={busy}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 px-3 py-2.5 text-xs font-semibold text-zinc-200 hover:border-zinc-700 disabled:opacity-50"
        >
          <Zap className="size-3.5 text-[var(--accent)]" />
          Ativar gatilho
        </button>
        <button
          type="button"
          onClick={onDispatch}
          disabled={busy}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-3 py-2.5 text-xs font-semibold text-zinc-950 disabled:opacity-50"
        >
          <Send className="size-3.5" />
          Disparar
        </button>
      </div>
    </article>
  );
}

function CouponsSection({ coupons }: { coupons: ApiCoupon[] }) {
  return (
    <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
      <div className="mb-4 flex items-center gap-2">
        <Ticket className="size-4 text-[var(--accent)]" />
        <h2 className="text-sm font-semibold text-zinc-100">
          Gestão de cupons
        </h2>
      </div>

      {coupons.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 px-4 py-8 text-center text-sm text-zinc-500">
          Nenhum cupom ativo. Crie o primeiro para vincular às campanhas.
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                  <th className="pb-3 pr-4 font-medium">Código</th>
                  <th className="pb-3 pr-4 font-medium">Desconto</th>
                  <th className="pb-3 pr-4 font-medium">Validade</th>
                  <th className="pb-3 pr-4 font-medium">Limite de uso</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr
                    key={coupon.id}
                    className="border-b border-zinc-800/80 last:border-0"
                  >
                    <td className="py-3 pr-4 font-semibold tracking-wide text-zinc-100">
                      {coupon.code}
                    </td>
                    <td className="py-3 pr-4 text-[var(--accent)]">
                      {coupon.discountPercent}%
                    </td>
                    <td className="py-3 pr-4 text-zinc-300">
                      {formatShortDate(coupon.expirationDate)}
                    </td>
                    <td className="py-3 pr-4 text-zinc-300">
                      {formatUsage(coupon)}
                    </td>
                    <td className="py-3">
                      <CouponBadge coupon={coupon} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {coupons.map((coupon) => (
              <article
                key={coupon.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold tracking-wide text-zinc-100">
                    {coupon.code}
                  </p>
                  <CouponBadge coupon={coupon} />
                </div>
                <p className="mt-2 text-sm text-[var(--accent)]">
                  {coupon.discountPercent}% off
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Válido até {formatShortDate(coupon.expirationDate)} ·{" "}
                  {formatUsage(coupon)}
                </p>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function HistorySection({ campaigns }: { campaigns: ApiCampaign[] }) {
  return (
    <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
      <div className="mb-4 flex items-center gap-2">
        <Send className="size-4 text-[var(--accent)]" />
        <h2 className="text-sm font-semibold text-zinc-100">
          Histórico de disparos
        </h2>
      </div>

      {campaigns.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 px-4 py-8 text-center text-sm text-zinc-500">
          Nenhuma campanha criada ainda. Ative um gatilho acima para registrar o
          primeiro disparo.
        </p>
      ) : (
        <ul className="space-y-2">
          {campaigns.map((campaign) => (
            <li
              key={campaign.id}
              className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-100">
                  {campaign.title}
                </p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {TYPE_LABELS[campaign.type]} ·{" "}
                  {formatShortDate(campaign.createdAt)}
                  {campaign.coupon ? ` · ${campaign.coupon.code}` : ""}
                </p>
              </div>
              <StatusBadge status={campaign.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CouponModal({
  form,
  submitting,
  error,
  onClose,
  onChange,
  onSubmit,
}: {
  form: CouponFormState;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onChange: React.Dispatch<React.SetStateAction<CouponFormState>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 md:items-center">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-50">
            Criar novo cupom
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
          <Field label="Código">
            <input
              required
              value={form.code}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  code: event.target.value.toUpperCase(),
                }))
              }
              placeholder="Ex: VOLTA10"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm tracking-wide text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Desconto (%)">
              <input
                required
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                inputMode="decimal"
                value={form.discountPercent}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    discountPercent: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
              />
            </Field>
            <Field label="Validade">
              <input
                required
                type="date"
                value={form.expirationDate}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    expirationDate: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none"
              />
            </Field>
          </div>
          <Field label="Limite de uso">
            <input
              type="number"
              min="1"
              step="1"
              value={form.usageLimit}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  usageLimit: event.target.value,
                }))
              }
              placeholder="Vazio = ilimitado"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
            />
          </Field>
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
            {submitting ? "Salvando..." : "Cadastrar cupom"}
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
  icon: typeof Ticket;
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

function StatusBadge({ status }: { status: ApiCampaignStatus }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        status === "SENT" &&
          "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20",
        status === "ACTIVE" &&
          "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]",
        status === "DRAFT" &&
          "bg-zinc-800 text-zinc-300 ring-1 ring-zinc-700",
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function CouponBadge({ coupon }: { coupon: ApiCoupon }) {
  const label = coupon.isExpired
    ? "Expirado"
    : coupon.isAvailable
      ? "Disponível"
      : "Esgotado";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        coupon.isAvailable
          ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20"
          : "bg-zinc-800 text-zinc-400 ring-1 ring-zinc-700",
      )}
    >
      {label}
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

function buildInitialDrafts(): Record<string, CampaignDraft> {
  return Object.fromEntries(
    CAMPAIGN_PRESETS.map((preset) => [
      preset.type,
      {
        message: preset.defaultMessage,
        filterValue: preset.defaultFilter,
        couponId: "",
      },
    ]),
  );
}

function hydrateDrafts(
  current: Record<string, CampaignDraft>,
  campaigns: ApiCampaign[],
): Record<string, CampaignDraft> {
  const next = { ...current };

  for (const preset of CAMPAIGN_PRESETS) {
    const latest = latestCampaign(campaigns, preset.type);
    if (!latest) {
      continue;
    }

    next[preset.type] = {
      message: latest.messageTemplate || current[preset.type].message,
      filterValue: filterValueFromCampaign(preset.type, latest) || current[preset.type].filterValue,
      couponId: latest.couponId ?? current[preset.type].couponId,
    };
  }

  return next;
}

function latestCampaign(campaigns: ApiCampaign[], type: ApiCampaignType) {
  return campaigns.find((campaign) => campaign.type === type);
}

function filterValueFromCampaign(
  type: ApiCampaignType,
  campaign: ApiCampaign,
): string {
  const audience = campaign.targetAudience ?? {};

  if (type === "INACTIVE_RECOVERY" && audience.inactiveDays) {
    return String(audience.inactiveDays);
  }

  if (type === "BIRTHDAY" && audience.birthMonth) {
    return String(audience.birthMonth);
  }

  if (type === "REFERRAL" && audience.minCompletedVisits) {
    return String(audience.minCompletedVisits);
  }

  return "";
}

function audienceParams(type: ApiCampaignType, draft: CampaignDraft) {
  const value = Number(draft.filterValue);
  const couponId = draft.couponId || undefined;

  if (type === "INACTIVE_RECOVERY") {
    return { inactiveDays: value, couponId };
  }

  if (type === "BIRTHDAY") {
    return { birthMonth: value, couponId };
  }

  return { minCompletedVisits: value, couponId };
}

function formatUsage(coupon: ApiCoupon) {
  if (coupon.usageLimit === null) {
    return `${coupon.usedCount} usos · ilimitado`;
  }

  return `${coupon.usedCount}/${coupon.usageLimit}`;
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dateInputToIso(value: string) {
  return new Date(`${value}T12:00:00`).toISOString();
}

function defaultExpirationDate() {
  const date = new Date();
  date.setMonth(date.getMonth() + 2);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const MONTH_OPTIONS = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];
