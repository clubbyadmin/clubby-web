"use client";

import { WhatsappPairingCard } from "@/components/whatsapp/whatsapp-pairing-card";
import {
  api,
  getErrorMessage,
  type ApiMessageLog,
  type ApiWhatsappAutomations,
  type ApiWhatsappConfig,
  type ApiWhatsappProvider,
} from "@/services/api";
import { Bot, Loader2, MessageCircle, PlugZap, Save, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Field, Section } from "./partner-shared";

const PROVIDER_LABELS: Record<ApiWhatsappProvider, string> = {
  MOCK: "Simulador Clubby (dev)",
  EVOLUTION: "Evolution API",
  WEBHOOK: "Webhook genérico",
};

export function PartnerWhatsappPanel({
  partnerId,
  onChanged,
}: {
  partnerId: string;
  onChanged?: () => void;
}) {
  const [config, setConfig] = useState<ApiWhatsappConfig | null>(null);
  const [logs, setLogs] = useState<ApiMessageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [provider, setProvider] = useState<ApiWhatsappProvider>("MOCK");
  const [apiUrl, setApiUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [automations, setAutomations] = useState<ApiWhatsappAutomations | null>(
    null,
  );
  const [manualPhone, setManualPhone] = useState("");
  const [manualMessage, setManualMessage] = useState("");
  const [enablingBot, setEnablingBot] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextConfig, nextLogs] = await Promise.all([
        api.getSuperAdminTenantWhatsapp(partnerId),
        api.getSuperAdminTenantWhatsappLogs(partnerId),
      ]);
      setConfig(nextConfig);
      setLogs(nextLogs);
      setProvider(nextConfig.provider);
      setApiUrl(nextConfig.apiUrl ?? "");
      setInstanceName(nextConfig.instanceName ?? "");
      setPhoneNumber(nextConfig.phoneNumber ?? "");
      setIsActive(nextConfig.isActive);
      setAutomations(nextConfig.automations);
      setApiToken("");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveConfig() {
    if (!automations) {
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const next = await api.upsertSuperAdminTenantWhatsapp(partnerId, {
        provider,
        apiUrl: apiUrl || null,
        apiToken: apiToken || undefined,
        instanceName: instanceName || null,
        phoneNumber: phoneNumber || null,
        isActive,
        automations,
      });
      setConfig(next);
      setApiToken("");
      setNotice("WhatsApp salvo e conexão testada.");
      onChanged?.();
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function enableInboundBot() {
    setEnablingBot(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.enableSuperAdminTenantInboundBot(partnerId);
      setNotice(result.message);
      if (result.config) {
        setConfig(result.config);
        setAutomations(result.config.automations);
      }
      onChanged?.();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setEnablingBot(false);
    }
  }

  async function disableInboundBot() {
    setEnablingBot(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.disableSuperAdminTenantInboundBot(partnerId);
      setNotice(result.message);
      if (result.config) {
        setConfig(result.config);
        setAutomations(result.config.automations);
      }
      onChanged?.();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setEnablingBot(false);
    }
  }

  async function sendManual(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      await api.sendSuperAdminTenantWhatsapp(partnerId, {
        recipientPhone: manualPhone,
        messageContent: manualMessage,
        type: "MANUAL",
      });
      setManualMessage("");
      setNotice("Mensagem enviada.");
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-zinc-500">Carregando WhatsApp do parceiro...</p>
    );
  }

  return (
    <div className="space-y-5">
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
            Conexão
          </p>
          <p className="mt-1 text-sm font-semibold text-zinc-100">
            {config?.status === "CONNECTED"
              ? "Conectado"
              : config?.status === "ERROR"
                ? "Falha"
                : config?.status === "INACTIVE"
                  ? "Inativo"
                  : "Não configurado"}
          </p>
          {config?.lastError ? (
            <p className="mt-1 text-xs text-red-300">{config.lastError}</p>
          ) : null}
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
            Provedor
          </p>
          <p className="mt-1 text-sm font-semibold text-zinc-100">
            {PROVIDER_LABELS[provider]}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
            Logs recentes
          </p>
          <p className="mt-1 text-sm font-semibold text-zinc-100">
            {logs.length}
          </p>
        </div>
      </div>

      <WhatsappPairingCard
        mode="super-admin"
        tenantId={partnerId}
        config={config}
        onConfigChange={(next) => {
          setConfig(next);
          setProvider(next.provider);
          setApiUrl(next.apiUrl ?? "");
          setInstanceName(next.instanceName ?? "");
          setPhoneNumber(next.phoneNumber ?? "");
          setIsActive(next.isActive);
          setAutomations(next.automations);
          // Não chamar onChanged/load aqui: recarregava a ficha inteira
          // e apagava o QR antes de aparecer.
          if (next.status === "CONNECTED") {
            onChanged?.();
          }
        }}
      />

      <Section
        title="Configuração avançada"
        description="Opcional. Com EVOLUTION_API_URL/KEY no servidor, o QR funciona sem preencher estes campos."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-zinc-400 sm:col-span-2">
            Provedor
            <select
              value={provider}
              onChange={(event) =>
                setProvider(event.target.value as ApiWhatsappProvider)
              }
              className="mt-1 h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100"
            >
              {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="URL da API"
            value={apiUrl}
            onChange={setApiUrl}
            required={false}
            placeholder="https://evolution.seudominio.com"
          />
          <Field
            label="Token / apikey"
            value={apiToken}
            onChange={setApiToken}
            required={false}
            type="password"
            placeholder={config?.apiTokenMasked ?? "Cole um novo token"}
          />
          <Field
            label="Instância (Evolution)"
            value={instanceName}
            onChange={setInstanceName}
            required={false}
          />
          <Field
            label="WhatsApp da instância"
            value={phoneNumber}
            onChange={setPhoneNumber}
            required={false}
            placeholder="5511999999999"
          />
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="size-4 accent-amber-300"
          />
          Manter conexão ativa
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveConfig()}
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-amber-300 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <PlugZap className="size-4" />
          )}
          Salvar e testar conexão
        </button>
      </Section>

      <Section
        title="Respostas quando o cliente escrever"
        description="Bot de conversa: o cliente manda oi no WhatsApp do salão e o Clubby responde, oferece serviços e agenda."
      >
        <p className="mb-3 text-xs text-zinc-400">
          Status:{" "}
          {automations?.inboundBotEnabled === true
            ? "ativas"
            : automations?.inboundBotEnabled === false
              ? "desativadas"
              : "não configuradas (se já ativou antes, use Desativar)"}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={enablingBot || config?.status !== "CONNECTED"}
            onClick={() => void enableInboundBot()}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-60"
          >
            {enablingBot ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Bot className="size-4" />
            )}
            Ativar respostas
          </button>
          <button
            type="button"
            disabled={enablingBot || config?.status !== "CONNECTED"}
            onClick={() => void disableInboundBot()}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-600 px-4 text-sm font-semibold text-zinc-100 disabled:opacity-60"
          >
            Desativar respostas
          </button>
        </div>
        {config?.status !== "CONNECTED" ? (
          <p className="mt-2 text-xs text-amber-200">
            Conecte o WhatsApp (QR) antes de ativar ou desativar.
          </p>
        ) : (
          <p className="mt-2 text-xs text-zinc-500">
            Desative para o bot deixar de responder. Os avisos de saída
            (confirmação, lembrete…) ficam nos toggles abaixo.
          </p>
        )}
      </Section>

      {automations ? (
        <Section
          title="Avisos automáticos (saída)"
          description="Mensagens que o Clubby dispara sozinho: confirmação, lembrete, aniversário e fila."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["confirmationEnabled", "Confirmação ao agendar"],
                ["reminderEnabled", "Lembrete antes do horário"],
                ["birthdayEnabled", "Aniversário"],
                ["waitlistEnabled", "Fila de espera"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-200"
              >
                <input
                  type="checkbox"
                  checked={automations[key]}
                  onChange={(event) =>
                    setAutomations({
                      ...automations,
                      [key]: event.target.checked,
                    })
                  }
                  className="size-4 accent-amber-300"
                />
                {label}
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveConfig()}
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-700 px-4 text-sm font-semibold text-zinc-100 disabled:opacity-60"
          >
            <Save className="size-4" />
            Salvar avisos
          </button>
        </Section>
      ) : null}

      <Section title="Disparo manual de teste">
        <form onSubmit={(event) => void sendManual(event)} className="space-y-3">
          <Field
            label="WhatsApp do destinatário"
            value={manualPhone}
            onChange={setManualPhone}
            placeholder="11988880001"
          />
          <label className="block text-xs text-zinc-400">
            Mensagem
            <textarea
              required
              value={manualMessage}
              onChange={(event) => setManualMessage(event.target.value)}
              rows={4}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-zinc-100 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-60"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Enviar agora
          </button>
        </form>
      </Section>

      <Section title="Últimos disparos">
        {logs.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum log ainda.</p>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 20).map((log) => (
              <div
                key={log.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-2 text-sm text-zinc-100">
                    <MessageCircle className="size-3.5 text-zinc-500" />
                    {log.recipientPhone}
                  </p>
                  <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                    {log.type} · {log.status}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-400">
                  {log.messageContent}
                </p>
                {log.errorMessage ? (
                  <p className="mt-1 text-xs text-red-300">{log.errorMessage}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
