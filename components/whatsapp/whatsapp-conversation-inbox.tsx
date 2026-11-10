"use client";

import { cn } from "@/lib/cn";
import type {
  ApiMessageLog,
  ApiWhatsappMessageStatus,
  ApiWhatsappMessageType,
} from "@/services/api";
import { MessageCircle, Search } from "lucide-react";
import { useMemo, useState } from "react";

const TYPE_LABELS: Record<ApiWhatsappMessageType, string> = {
  REMINDER: "Lembrete",
  BIRTHDAY: "Aniversário",
  WAITLIST: "Fila",
  MARKETING: "Marketing",
  MANUAL: "Resposta",
  INBOUND: "Cliente",
};

const STATUS_LABELS: Record<ApiWhatsappMessageStatus, string> = {
  SENT: "Enviado",
  FAILED: "Falhou",
  RECEIVED: "Recebido",
};

type Thread = {
  phone: string;
  messages: ApiMessageLog[];
  lastAt: number;
  lastPreview: string;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function formatPhone(phone: string) {
  const digits = digitsOnly(phone);
  if (digits.length === 13 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

function buildThreads(logs: ApiMessageLog[]): Thread[] {
  const map = new Map<string, ApiMessageLog[]>();

  for (const log of logs) {
    const key = digitsOnly(log.recipientPhone) || log.recipientPhone;
    const bucket = map.get(key) ?? [];
    bucket.push(log);
    map.set(key, bucket);
  }

  return [...map.entries()]
    .map(([phone, messages]) => {
      const ordered = [...messages].sort(
        (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
      );
      const last = ordered[ordered.length - 1];
      return {
        phone,
        messages: ordered,
        lastAt: last ? new Date(last.sentAt).getTime() : 0,
        lastPreview: last?.messageContent ?? "",
      };
    })
    .sort((a, b) => b.lastAt - a.lastAt);
}

export function WhatsappConversationInbox({
  logs,
  title = "Conversas por WhatsApp",
}: {
  logs: ApiMessageLog[];
  title?: string;
}) {
  const threads = useMemo(() => buildThreads(logs), [logs]);
  const [query, setQuery] = useState("");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = digitsOnly(query) || query.trim().toLowerCase();
    if (!needle) {
      return threads;
    }
    return threads.filter((thread) => {
      const phone = digitsOnly(thread.phone);
      const preview = thread.lastPreview.toLowerCase();
      if (digitsOnly(query)) {
        return phone.includes(needle);
      }
      return phone.includes(needle) || preview.includes(needle);
    });
  }, [threads, query]);

  const activePhone =
    selectedPhone && filtered.some((thread) => thread.phone === selectedPhone)
      ? selectedPhone
      : (filtered[0]?.phone ?? null);

  const active = filtered.find((thread) => thread.phone === activePhone) ?? null;

  if (logs.length === 0) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
        <p className="mt-3 text-sm text-zinc-500">
          Nenhuma conversa ainda. Quando o cliente escrever ou o Clubby
          responder, o histórico aparece aqui por número.
        </p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/70">
      <div className="border-b border-zinc-800 px-5 py-4">
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Uma janela por telefone. Busque o número para ver a última conversa
          daquele cliente.
        </p>
        <label className="relative mt-3 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por WhatsApp (ex.: 987796907)"
            className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600"
          />
        </label>
      </div>

      <div className="grid lg:grid-cols-[minmax(240px,320px)_1fr]">
        <aside className="max-h-[28rem] overflow-y-auto border-b border-zinc-800 lg:border-b-0 lg:border-r">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-sm text-zinc-500">
              Nenhum número encontrado para essa busca.
            </p>
          ) : (
            filtered.map((thread) => {
              const selected = thread.phone === activePhone;
              return (
                <button
                  key={thread.phone}
                  type="button"
                  onClick={() => setSelectedPhone(thread.phone)}
                  className={cn(
                    "w-full border-b border-zinc-800/80 px-4 py-3 text-left transition",
                    selected
                      ? "bg-zinc-800/70"
                      : "bg-transparent hover:bg-zinc-900/80",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="inline-flex items-center gap-2 text-sm font-medium text-zinc-100">
                      <MessageCircle className="size-3.5 shrink-0 text-zinc-500" />
                      {formatPhone(thread.phone)}
                    </p>
                    <span className="shrink-0 text-[10px] text-zinc-500">
                      {thread.lastAt
                        ? new Date(thread.lastAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-400">
                    {thread.lastPreview}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-600">
                    {thread.messages.length} mensagem
                    {thread.messages.length === 1 ? "" : "s"}
                  </p>
                </button>
              );
            })
          )}
        </aside>

        <div className="flex max-h-[28rem] min-h-[18rem] flex-col bg-zinc-950/40">
          {active ? (
            <>
              <div className="border-b border-zinc-800 px-4 py-3">
                <p className="text-sm font-semibold text-zinc-100">
                  {formatPhone(active.phone)}
                </p>
                <p className="text-xs text-zinc-500">
                  Última mensagem{" "}
                  {new Date(active.lastAt).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {active.messages.map((log) => {
                  const fromClient = log.type === "INBOUND";
                  return (
                    <div
                      key={log.id}
                      className={cn(
                        "flex",
                        fromClient ? "justify-start" : "justify-end",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                          fromClient
                            ? "bg-zinc-800 text-zinc-100"
                            : "bg-emerald-500/15 text-emerald-50 ring-1 ring-emerald-500/20",
                          log.status === "FAILED" &&
                            "ring-1 ring-red-400/40 text-red-100",
                        )}
                      >
                        <p className="whitespace-pre-wrap">{log.messageContent}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500">
                          {TYPE_LABELS[log.type]} · {STATUS_LABELS[log.status]} ·{" "}
                          {new Date(log.sentAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {log.errorMessage ? (
                          <p className="mt-1 text-xs text-red-300">
                            {log.errorMessage}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="m-auto px-4 text-sm text-zinc-500">
              Selecione um número à esquerda.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
