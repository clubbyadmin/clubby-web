"use client";

import {
  api,
  getErrorMessage,
  type ApiWhatsappConfig,
  type ApiWhatsappPairing,
} from "@/services/api";
import { Loader2, QrCode, RefreshCw, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type PairingMode = "tenant" | "super-admin";

export function WhatsappPairingCard({
  mode,
  tenantId,
  config,
  onConfigChange,
}: {
  mode: PairingMode;
  tenantId: string;
  config: ApiWhatsappConfig | null;
  onConfigChange?: (config: ApiWhatsappConfig) => void;
}) {
  const [pairing, setPairing] = useState<ApiWhatsappPairing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    setPairing(null);
    try {
      const result =
        mode === "super-admin"
          ? await api.startSuperAdminTenantWhatsappPairing(tenantId)
          : await api.startWhatsappPairing(tenantId);
      setPairing(result);
      onConfigChange?.(result.config);
      if (
        result.status === "WAITING_QR" &&
        !result.qrcodeBase64 &&
        !result.pairingCode
      ) {
        setError(
          "A Evolution respondeu sem QR. Rode deploy/test-evolution-qr.sh no Lightsail e envie a saída.",
        );
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }, [mode, onConfigChange, tenantId]);

  const refresh = useCallback(async () => {
    try {
      const result =
        mode === "super-admin"
          ? await api.getSuperAdminTenantWhatsappPairingStatus(tenantId)
          : await api.getWhatsappPairingStatus(tenantId);
      setPairing(result);
      onConfigChange?.(result.config);
      return result;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      return null;
    }
  }, [mode, onConfigChange, tenantId]);

  useEffect(() => {
    if (pairing?.status !== "WAITING_QR") {
      return;
    }

    const timer = window.setInterval(() => {
      void refresh();
    }, 4000);

    return () => window.clearInterval(timer);
  }, [pairing?.status, refresh]);

  const connected =
    pairing?.status === "CONNECTED" || config?.status === "CONNECTED";
  const waiting = pairing?.status === "WAITING_QR";

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <Smartphone className="size-4 text-amber-300" />
            Conectar WhatsApp
          </h2>
          <p className="mt-1 max-w-xl text-xs text-zinc-500">
            O QR Code aparece aqui no Clubby. Escaneie com o celular do
            estabelecimento em WhatsApp → Aparelhos conectados.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void start()}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-amber-300 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <QrCode className="size-4" />
            )}
            {busy
              ? "Gerando QR..."
              : connected
                ? "Gerar novo QR"
                : "Conectar WhatsApp"}
          </button>
          {waiting ? (
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-700 px-4 text-sm font-semibold text-zinc-100"
            >
              <RefreshCw className="size-4" />
              Atualizar
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      {pairing?.message ? (
        <p
          className={`mt-3 text-sm ${
            pairing.status === "CONNECTED"
              ? "text-emerald-300"
              : pairing.status === "ERROR"
                ? "text-red-300"
                : "text-zinc-300"
          }`}
        >
          {pairing.message}
        </p>
      ) : null}

      {connected && !waiting ? (
        <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          WhatsApp conectado
          {pairing?.instanceName || config?.instanceName
            ? ` · instância ${pairing?.instanceName ?? config?.instanceName}`
            : ""}
          .
        </div>
      ) : null}

      {waiting ? (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-zinc-800 bg-white p-4 sm:flex-row sm:items-start">
          {pairing?.qrcodeBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pairing.qrcodeBase64}
              alt="QR Code WhatsApp"
              className="size-56 rounded-xl"
            />
          ) : (
            <div className="flex size-56 items-center justify-center rounded-xl bg-zinc-100 text-center text-xs text-zinc-500">
              Gerando QR…
              <br />
              clique em Atualizar se demorar
            </div>
          )}
          <div className="space-y-2 text-sm text-zinc-700">
            <p className="font-semibold text-zinc-900">Como conectar</p>
            <ol className="list-decimal space-y-1 pl-4 text-zinc-600">
              <li>Abra o WhatsApp no celular do salão</li>
              <li>Menu → Aparelhos conectados → Conectar aparelho</li>
              <li>Aponte a câmera para este QR</li>
            </ol>
            {pairing?.pairingCode ? (
              <p className="rounded-xl bg-zinc-100 px-3 py-2 font-mono text-xs text-zinc-800">
                Código de pareamento: {pairing.pairingCode}
              </p>
            ) : null}
            <p className="text-xs text-zinc-500">
              Esta tela atualiza sozinha a cada poucos segundos.
            </p>
          </div>
        </div>
      ) : null}

      {!config?.pairingReady && !connected ? (
        <p className="mt-3 text-xs text-amber-200/90">
          Se o botão falhar, configure `EVOLUTION_API_URL` e `EVOLUTION_API_KEY`
          no servidor — ou salve URL/token em configuração avançada.
        </p>
      ) : null}
    </section>
  );
}
