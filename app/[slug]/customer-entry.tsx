"use client";

import { useTenant } from "@/contexts/tenant-context";
import {
  readStoredAdminUser,
  writeStoredAdminUser,
} from "@/lib/admin-session-storage";
import { api, getErrorMessage, setAccessToken } from "@/services/api";
import { Mail } from "lucide-react";
import { useEffect, useState } from "react";

type Step = "choose" | "email" | "email-code" | "phone" | "phone-code" | "ready";

const PROVIDERS = [
  { id: "google", label: "Gmail" },
  { id: "apple", label: "Apple" },
  { id: "microsoft", label: "Microsoft" },
] as const;

export function CustomerEntry() {
  const { tenant } = useTenant();
  const [step, setStep] = useState<Step>("choose");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [pendingToken, setPendingToken] = useState("");
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = readStoredAdminUser();

    if (stored?.role === "CUSTOMER" && stored.tenantId === tenant.id) {
      setName(stored.name);
      setStep("ready");
    }

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = hash.get("entrada");
    const entryError = hash.get("entrada-erro");

    if (token) {
      setPendingToken(token);
      setStep("phone");
      setError(null);
    } else if (entryError) {
      setError(entryError);
    }

    if (token || entryError) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [tenant.id]);

  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError(null);

    try {
      await work();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  function rememberSession(session: {
    accessToken: string;
    user: {
      id: string;
      tenantId: string;
      name: string;
      email: string | null;
      phone: string;
      role: "CUSTOMER";
    };
  }) {
    setAccessToken(session.accessToken);
    writeStoredAdminUser(session.user);
    setName(session.user.name);
    setStep("ready");
    window.dispatchEvent(new Event("clubby-customer-session"));
  }

  return (
    <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Sua conta</p>
      {step === "ready" && name ? (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-100">Você entrou como {name}.</p>
          <button
            type="button"
            className="text-xs font-semibold text-zinc-400"
            onClick={() => {
              setAccessToken(null);
              writeStoredAdminUser(null);
              setName(null);
              setStep("choose");
              window.dispatchEvent(new Event("clubby-customer-session"));
            }}
          >
            Sair
          </button>
        </div>
      ) : (
        <p className="mt-1 text-sm text-zinc-300">
          Entre com e-mail, Gmail, Apple ou Microsoft. O celular confirma o cadastro.
        </p>
      )}

      {step === "choose" ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const started = await api.startCustomerProvider(provider.id, tenant.slug);
                  window.location.assign(started.url);
                })
              }
              className="min-h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm font-semibold text-zinc-100"
            >
              {provider.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStep("email");
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm font-semibold text-zinc-100"
          >
            <Mail className="size-4" strokeWidth={2.2} />
            E-mail
          </button>
        </div>
      ) : null}

      {step === "email" ? (
        <form
          className="mt-3 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              const started = await api.startCustomerEmail(tenant.slug, email);
              setChallengeId(started.challengeId);
              setPreviewCode(started.previewCode);
              setCode("");
              setStep("email-code");
            });
          }}
        >
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="seu@email.com"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none"
          />
          <Submit label="Receber código" busy={busy} />
        </form>
      ) : null}

      {step === "email-code" ? (
        <form
          className="mt-3 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              const verified = await api.verifyCustomerEmail(challengeId, code);
              setPendingToken(verified.pendingToken);
              setCode("");
              setPreviewCode(null);
              setStep("phone");
            });
          }}
        >
          <CodeField value={code} onChange={setCode} />
          <Preview code={previewCode} />
          <Submit label="Confirmar e-mail" busy={busy} />
        </form>
      ) : null}

      {step === "phone" ? (
        <form
          className="mt-3 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              const started = await api.startCustomerPhone(pendingToken, phone);
              setChallengeId(started.challengeId);
              setPreviewCode(started.previewCode);
              setCode("");
              setStep("phone-code");
            });
          }}
        >
          <p className="text-xs text-zinc-400">
            O celular é obrigatório para fechar a verificação.
          </p>
          <input
            type="tel"
            required
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="11999998888"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none"
          />
          <Submit label="Enviar código no celular" busy={busy} />
        </form>
      ) : null}

      {step === "phone-code" ? (
        <form
          className="mt-3 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              const session = await api.confirmCustomerPhone(challengeId, code);
              rememberSession(session);
            });
          }}
        >
          <CodeField value={code} onChange={setCode} />
          <Preview code={previewCode} />
          <Submit label="Concluir cadastro" busy={busy} />
        </form>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </section>
  );
}

function CodeField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      inputMode="numeric"
      autoComplete="one-time-code"
      required
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Código de 6 dígitos"
      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none"
    />
  );
}

function Preview({ code }: { code: string | null }) {
  if (!code) {
    return null;
  }

  return (
    <p className="rounded-xl bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
      Código de demonstração: <span className="font-semibold text-zinc-100">{code}</span>
    </p>
  );
}

function Submit({ label, busy }: { label: string; busy: boolean }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="min-h-11 w-full rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] text-sm font-semibold text-zinc-950 disabled:opacity-60"
    >
      {busy ? "Aguarde..." : label}
    </button>
  );
}
