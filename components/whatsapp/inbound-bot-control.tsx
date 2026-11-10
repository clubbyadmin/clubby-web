"use client";

import { Bot, Loader2, Power } from "lucide-react";

export type InboundBotState = boolean | null | undefined;

export function inboundBotIsOn(value: InboundBotState) {
  return value === true;
}

export function inboundBotIsOff(value: InboundBotState) {
  return value === false;
}

export function InboundBotControl({
  enabled,
  busy,
  connected,
  notice,
  error,
  onEnable,
  onDisable,
}: {
  enabled: InboundBotState;
  busy: boolean;
  connected: boolean;
  notice?: string | null;
  error?: string | null;
  onEnable: () => void;
  onDisable: () => void;
}) {
  const isOn = inboundBotIsOn(enabled);
  const isOff = inboundBotIsOff(enabled);
  const isUnknown = !isOn && !isOff;

  return (
    <div className="space-y-4">
      <div
        className={
          isOn
            ? "rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3"
            : isOff
              ? "rounded-2xl border border-zinc-700 bg-zinc-900/80 px-4 py-3"
              : "rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3"
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              Status das respostas automáticas
            </p>
            <p
              className={
                isOn
                  ? "mt-1 text-lg font-semibold text-emerald-300"
                  : isOff
                    ? "mt-1 text-lg font-semibold text-zinc-200"
                    : "mt-1 text-lg font-semibold text-amber-200"
              }
            >
              {isOn ? "Ativas" : isOff ? "Desativadas" : "Estado não gravado"}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {isOn
                ? "Quando o cliente escrever no WhatsApp, o Clubby responde e agenda."
                : isOff
                  ? "O Clubby não responde mensagens de entrada neste momento."
                  : "Clique em Ativar ou Desativar para gravar o estado com clareza."}
            </p>
          </div>
          <span
            className={
              isOn
                ? "inline-flex items-center gap-2 rounded-full bg-emerald-400 px-3 py-1 text-xs font-bold uppercase tracking-wide text-zinc-950"
                : isOff
                  ? "inline-flex items-center gap-2 rounded-full bg-zinc-700 px-3 py-1 text-xs font-bold uppercase tracking-wide text-zinc-100"
                  : "inline-flex items-center gap-2 rounded-full bg-amber-300 px-3 py-1 text-xs font-bold uppercase tracking-wide text-zinc-950"
            }
          >
            <span
              className={
                isOn
                  ? "size-2 rounded-full bg-zinc-950"
                  : isOff
                    ? "size-2 rounded-full bg-zinc-400"
                    : "size-2 rounded-full bg-zinc-950"
              }
            />
            {isOn ? "Ligado" : isOff ? "Desligado" : "Indefinido"}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {isOn ? (
          <button
            type="button"
            disabled={busy || !connected}
            onClick={onDisable}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-600 bg-zinc-900 px-4 text-sm font-semibold text-zinc-100 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Power className="size-4" />
            )}
            Desativar respostas
          </button>
        ) : isOff ? (
          <button
            type="button"
            disabled={busy || !connected}
            onClick={onEnable}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Bot className="size-4" />
            )}
            Ativar respostas
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={busy || !connected}
              onClick={onEnable}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Bot className="size-4" />
              )}
              Ativar respostas
            </button>
            <button
              type="button"
              disabled={busy || !connected}
              onClick={onDisable}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-600 px-4 text-sm font-semibold text-zinc-100 disabled:opacity-60"
            >
              Desativar respostas
            </button>
          </>
        )}
      </div>

      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {!connected ? (
        <p className="text-xs text-amber-200">
          Conecte o WhatsApp (QR) antes de ativar ou desativar.
        </p>
      ) : null}
    </div>
  );
}
