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
  type ApiMessageLog,
  type ApiWhatsappAutomations,
  type ApiWhatsappConfig,
  type ApiWhatsappMessageStatus,
  type ApiWhatsappMessageType,
  type ApiWhatsappProvider,
} from "@/services/api";
import {
  Cake,
  CalendarClock,
  Loader2,
  MessageCircle,
  Mic,
  PlugZap,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const PROVIDER_LABELS: Record<ApiWhatsappProvider, string> = {
  MOCK: "Simulador Clubby (dev)",
  EVOLUTION: "Evolution API",
  WEBHOOK: "Webhook genérico",
};

const TYPE_LABELS: Record<ApiWhatsappMessageType, string> = {
  REMINDER: "Lembrete",
  BIRTHDAY: "Aniversário",
  WAITLIST: "Fila de espera",
  MARKETING: "Marketing",
  MANUAL: "Manual",
  INBOUND: "Recebida",
};

const STATUS_STYLE: Record<ApiWhatsappMessageStatus, string> = {
  SENT: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25",
  FAILED: "bg-red-400/10 text-red-300 ring-red-400/25",
  RECEIVED: "bg-sky-400/10 text-sky-300 ring-sky-400/25",
};

export function WhatsappBoard() {
  const { tenant, loading: tenantLoading } = useTenant();
  const tenantId = tenant.id === "local" ? undefined : tenant.id;

  const [config, setConfig] = useState<ApiWhatsappConfig | null>(null);
  const [logs, setLogs] = useState<ApiMessageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
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
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) {
      return;
    }

    const [nextConfig, nextLogs] = await Promise.all([
      api.getWhatsappConfig(tenantId),
      api.getWhatsappLogs({ tenantId }),
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
  }, [tenantId]);

  useEffect(() => {
    if (tenantLoading || !tenantId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

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
  }, [load, tenantId, tenantLoading]);

  async function saveConfig() {
    if (!tenantId || !automations) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const next = await api.upsertWhatsappConfig({
        tenantId,
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
      await load();
    } catch (requestError) {
      setSaveError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function sendManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantId) {
      return;
    }

    setSending(true);
    setSendError(null);

    try {
      await api.sendWhatsappMessage({
        tenantId,
        recipientPhone: manualPhone,
        messageContent: manualMessage,
        type: "MANUAL",
      });
      setManualMessage("");
      await load();
    } catch (requestError) {
      setSendError(getErrorMessage(requestError));
    } finally {
      setSending(false);
    }
  }

  const connectionLabel =
    config?.status === "CONNECTED"
      ? "Conectado"
      : config?.status === "ERROR"
        ? "Falha na conexão"
        : config?.status === "INACTIVE"
          ? "Desconectado"
          : "Não configurado";

  return (
    <div className="flex flex-1 flex-col px-4 pb-8 pt-6 lg:px-8">
      <header>
        <div>
          <TenantBadge />
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50">
            WhatsApp e automações
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Conecte a instância, personalize lembretes e acompanhe cada disparo
            da operação.
          </p>
        </div>
      </header>

      <AdminNav className="mt-4 lg:hidden" />

      {loading || tenantLoading ? (
        <LoadingState message="Carregando WhatsApp..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : (
        <div className="mt-8 space-y-6">
          <section className="grid gap-3 sm:grid-cols-3">
            <StatusCard
              label="Conexão"
              value={connectionLabel}
              hint={
                config?.status === "CONNECTED"
                  ? config.apiTokenMasked
                    ? `Token ${config.apiTokenMasked}`
                    : "Pronto para disparar"
                  : "Configure a API para disparar"
              }
              tone={
                config?.status === "CONNECTED"
                  ? "text-emerald-300"
                  : config?.status === "ERROR"
                    ? "text-red-300"
                    : "text-amber-300"
              }
              icon={PlugZap}
            />
            <StatusCard
              label="Provedor"
              value={PROVIDER_LABELS[provider]}
              hint={config?.phoneNumber ?? "Sem número da instância"}
              icon={MessageCircle}
            />
            <StatusCard
              label="Disparos recentes"
              value={String(logs.length)}
              hint={`${logs.filter((item) => item.status === "SENT").length} enviados`}
              icon={Send}
            />
          </section>

          <ConversationTester />

          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <AccentIconWrap className="size-8">
                  <PlugZap className="size-4" />
                </AccentIconWrap>
                Instância
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-zinc-400 sm:col-span-2">
                  Provedor
                  <select
                    value={provider}
                    onChange={(event) =>
                      setProvider(event.target.value as ApiWhatsappProvider)
                    }
                    className="mt-1 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100"
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
                  placeholder="https://evolution.seudominio.com"
                />
                <Field
                  label="Token / apikey"
                  value={apiToken}
                  onChange={setApiToken}
                  placeholder={config?.apiTokenMasked ?? "Cole um novo token"}
                  type="password"
                />
                <Field
                  label="Instância (Evolution)"
                  value={instanceName}
                  onChange={setInstanceName}
                  placeholder="studio-barbearia"
                />
                <Field
                  label="WhatsApp da instância"
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  placeholder="5511999999999"
                />
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                />
                Manter conexão ativa
              </label>
              {saveError ? (
                <p className="mt-3 text-sm text-red-300">{saveError}</p>
              ) : null}
              <button
                type="button"
                onClick={() => void saveConfig()}
                disabled={saving}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Salvar e testar conexão
              </button>
            </div>

            <form
              onSubmit={(event) => void sendManual(event)}
              className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5"
            >
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <AccentIconWrap className="size-8">
                  <Send className="size-4" />
                </AccentIconWrap>
                Disparo manual
              </h2>
              <Field
                className="mt-4"
                label="WhatsApp do cliente"
                value={manualPhone}
                onChange={setManualPhone}
                placeholder="11988880001"
              />
              <label className="mt-3 block text-xs text-zinc-400">
                Mensagem
                <textarea
                  required
                  value={manualMessage}
                  onChange={(event) => setManualMessage(event.target.value)}
                  rows={5}
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              {sendError ? (
                <p className="mt-3 text-sm text-red-300">{sendError}</p>
              ) : null}
              <button
                type="submit"
                disabled={sending}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : null}
                Enviar agora
              </button>
            </form>
          </section>

          {automations ? (
            <section className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
              <h2 className="text-sm font-semibold text-zinc-100">
                Mensagens automáticas
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Toggle
                  icon={Sparkles}
                  label="Confirmação ao agendar"
                  checked={automations.confirmationEnabled}
                  onChange={(confirmationEnabled) =>
                    setAutomations({ ...automations, confirmationEnabled })
                  }
                />
                <Toggle
                  icon={CalendarClock}
                  label={`Lembrete ${automations.reminderHoursBefore}h antes`}
                  checked={automations.reminderEnabled}
                  onChange={(reminderEnabled) =>
                    setAutomations({ ...automations, reminderEnabled })
                  }
                />
                <Toggle
                  icon={Cake}
                  label="Parabéns de aniversário"
                  checked={automations.birthdayEnabled}
                  onChange={(birthdayEnabled) =>
                    setAutomations({ ...automations, birthdayEnabled })
                  }
                />
                <Toggle
                  icon={Users}
                  label="Encaixe da fila de espera"
                  checked={automations.waitlistEnabled}
                  onChange={(waitlistEnabled) =>
                    setAutomations({ ...automations, waitlistEnabled })
                  }
                />
              </div>
              <label className="mt-4 block max-w-xs text-xs text-zinc-400">
                Antecedência do lembrete (horas)
                <input
                  type="number"
                  min={1}
                  max={72}
                  value={automations.reminderHoursBefore}
                  onChange={(event) =>
                    setAutomations({
                      ...automations,
                      reminderHoursBefore: Number(event.target.value) || 24,
                    })
                  }
                  className="mt-1 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100"
                />
              </label>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <TemplateField
                  label="Confirmação"
                  value={automations.templates.confirmation}
                  onChange={(confirmation) =>
                    setAutomations({
                      ...automations,
                      templates: { ...automations.templates, confirmation },
                    })
                  }
                />
                <TemplateField
                  label="Lembrete"
                  value={automations.templates.reminder}
                  onChange={(reminder) =>
                    setAutomations({
                      ...automations,
                      templates: { ...automations.templates, reminder },
                    })
                  }
                />
                <TemplateField
                  label="Aniversário"
                  value={automations.templates.birthday}
                  onChange={(birthday) =>
                    setAutomations({
                      ...automations,
                      templates: { ...automations.templates, birthday },
                    })
                  }
                />
                <TemplateField
                  label="Fila de espera"
                  value={automations.templates.waitlist}
                  onChange={(waitlist) =>
                    setAutomations({
                      ...automations,
                      templates: { ...automations.templates, waitlist },
                    })
                  }
                />
              </div>
              <p className="mt-3 text-[11px] text-zinc-500">
                Variáveis: {"{{clientName}}"}, {"{{professionalName}}"},{" "}
                {"{{serviceName}}"}, {"{{date}}"}, {"{{time}}"}, {"{{tenantName}}"}.
              </p>
            </section>
          ) : null}

          <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/70">
            <div className="border-b border-zinc-800 px-5 py-4">
              <h2 className="text-sm font-semibold text-zinc-100">
                Histórico de disparos
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Quando</th>
                    <th className="px-5 py-3 font-medium">Destino</th>
                    <th className="px-5 py-3 font-medium">Tipo</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Mensagem</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-t border-zinc-800/80">
                      <td className="whitespace-nowrap px-5 py-3 text-xs text-zinc-500">
                        {new Date(log.sentAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-5 py-3 text-zinc-200">
                        {log.recipientPhone}
                      </td>
                      <td className="px-5 py-3 text-xs text-zinc-400">
                        {TYPE_LABELS[log.type]}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                            STATUS_STYLE[log.status],
                          )}
                        >
                          {log.status === "SENT" ? "Enviado" : "Falhou"}
                        </span>
                      </td>
                      <td className="max-w-sm truncate px-5 py-3 text-xs text-zinc-400">
                        {log.errorMessage ?? log.messageContent}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-zinc-500">
                  Nenhum disparo ainda. Salve a conexão e envie um teste.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function StatusCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "text-zinc-50",
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof MessageCircle;
  tone?: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
        <Icon className="size-4 text-[var(--accent)]" />
      </div>
      <p className={cn("mt-3 text-lg font-semibold", tone)}>{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <label className={cn("block text-xs text-zinc-400", className)}>
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100"
      />
    </label>
  );
}

function Toggle({
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  icon: typeof Cake;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-200">
      <Icon className="size-4 text-[var(--accent)]" />
      <span className="flex-1">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function TemplateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs text-zinc-400">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
      />
    </label>
  );
}

function ConversationTester() {
  const [phone, setPhone] = useState("5511900000001");
  const [text, setText] = useState("oi");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ from: "cliente" | "salao"; text: string }>>(
    [],
  );
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [policy, setPolicy] = useState<"rotation" | "newest">("rotation");
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    void api.getAssignmentPolicy().then((result) => setPolicy(result.policy)).catch(() => undefined);
  }, []);

  async function choosePolicy(next: "rotation" | "newest") {
    setSavingPolicy(true);
    setError(null);
    try {
      const saved = await api.saveAssignmentPolicy(next);
      setPolicy(saved.policy);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSavingPolicy(false);
    }
  }

  async function sendTurn(payload: {
    text?: string;
    audioBase64?: string;
    mimeType?: string;
    clientText: string;
  }) {
    setSending(true);
    setError(null);
    setMessages((current) => [...current, { from: "cliente", text: payload.clientText }]);

    try {
      const result = await api.simulateWhatsappConversation({
        from: phone,
        text: payload.text,
        audioBase64: payload.audioBase64,
        mimeType: payload.mimeType,
      });
      setAiEnabled(result.ai);
      setAiNote(result.aiNote ?? null);
      if (result.appointmentId) {
        setAppointmentId(result.appointmentId);
      }
      if (result.transcript) {
        setMessages((current) => {
          const next = [...current];
          const last = next[next.length - 1];
          if (last?.from === "cliente") {
            next[next.length - 1] = { ...last, text: `Áudio: ${result.transcript}` };
          }
          return next;
        });
      }
      setMessages((current) => [...current, { from: "salao", text: result.reply }]);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSending(false);
    }
  }

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const outgoing = text.trim();

    if (!outgoing) {
      return;
    }

    setText("");
    await sendTurn({ text: outgoing, clientText: outgoing });
  }

  async function sendAudio(file: Blob) {
    const audioBase64 = await blobToBase64(file);
    await sendTurn({
      audioBase64,
      mimeType: file.type || "audio/webm",
      clientText: "Áudio",
    });
  }

  async function toggleRecording() {
    if (recording && recorderRef.current) {
      recorderRef.current.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        void sendAudio(blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("O navegador não liberou o microfone.");
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
      <h2 className="text-sm font-semibold text-zinc-100">Testar conversa</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <PolicyButton
          active={policy === "rotation"}
          disabled={savingPolicy}
          onClick={() => void choosePolicy("rotation")}
          label="Roleta do dia"
        />
        <PolicyButton
          active={policy === "newest"}
          disabled={savingPolicy}
          onClick={() => void choosePolicy("newest")}
          label="Sempre o mais novo"
        />
      </div>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        Escreva ou grave um áudio como no WhatsApp. Nomes com erro de digitação
        e horários como 09h45 entram na conversa. Se o horário não estiver livre,
        a recepção oferece o mais perto ou a fila. Nenhuma mensagem sai para um telefone.
      </p>
      {aiNote ? (
        <p className="mt-2 text-sm text-amber-200">{aiNote}</p>
      ) : aiEnabled ? (
        <p className="mt-2 text-sm text-zinc-500">A OpenAI foi chamada nesta mensagem.</p>
      ) : null}
      {appointmentId ? (
        <p className="mt-2 text-sm text-emerald-300">
          Horário gravado na agenda.{" "}
          <Link href="/admin/agenda" className="underline">
            Abrir agenda
          </Link>
        </p>
      ) : null}
      <div className="mt-4 space-y-3">
        {messages.map((message, index) => (
          <p
            key={`${message.from}-${index}`}
            className={
              message.from === "cliente"
                ? "ml-auto max-w-xl whitespace-pre-wrap rounded-2xl bg-zinc-800 px-4 py-3 text-sm text-zinc-100"
                : "max-w-xl whitespace-pre-wrap rounded-2xl bg-zinc-900 px-4 py-3 text-sm text-zinc-300"
            }
          >
            {message.text}
          </p>
        ))}
      </div>
      <form onSubmit={(event) => void handleSend(event)} className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr_auto]">
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          aria-label="WhatsApp do cliente"
          className="h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100"
        />
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-label="Mensagem"
          className="h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100"
        />
        <button
          type="submit"
          disabled={sending || recording}
          className="h-11 rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-zinc-950 disabled:opacity-50"
        >
          {sending ? "Enviando..." : "Enviar"}
        </button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void toggleRecording()}
          disabled={sending}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-700 px-4 text-sm text-zinc-200 disabled:opacity-50"
        >
          <Mic className="h-4 w-4" />
          {recording ? "Parar e enviar" : "Gravar áudio"}
        </button>
        <label className="inline-flex h-10 cursor-pointer items-center rounded-full border border-zinc-700 px-4 text-sm text-zinc-200">
          Enviar arquivo
          <input
            type="file"
            accept="audio/*"
            className="sr-only"
            disabled={sending || recording}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                void sendAudio(file);
              }
            }}
          />
        </label>
      </div>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </section>
  );
}

function PolicyButton({
  active,
  disabled,
  label,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        active
          ? "h-9 rounded-full bg-zinc-100 px-3 text-xs font-semibold text-zinc-950"
          : "h-9 rounded-full border border-zinc-700 px-3 text-xs text-zinc-300"
      }
    >
      {label}
    </button>
  );
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
