"use client";

import { useTenant } from "@/contexts/tenant-context";
import {
  readStoredAdminUser,
  writeStoredAdminUser,
} from "@/lib/admin-session-storage";
import { cn } from "@/lib/cn";
import { api, getErrorMessage, setAccessToken } from "@/services/api";
import { ChevronLeft, Mail, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

type Step = "choose" | "email" | "email-code" | "phone" | "phone-code" | "ready";

const PROVIDERS = [
  {
    id: "google" as const,
    label: "Continuar com Google",
    mark: "G",
    className: "bg-white text-zinc-900 hover:bg-zinc-100",
  },
  {
    id: "apple" as const,
    label: "Continuar com Apple",
    mark: "",
    className: "bg-zinc-100 text-zinc-950 hover:bg-white",
  },
  {
    id: "microsoft" as const,
    label: "Continuar com Microsoft",
    mark: "M",
    className: "bg-[#2F2F2F] text-zinc-50 hover:bg-zinc-800 ring-1 ring-zinc-700",
  },
];

type CustomerEntryProps = {
  /** Quando true, remove o título interno (o shell já explica). */
  embedded?: boolean;
};

export function CustomerEntry({ embedded = false }: CustomerEntryProps) {
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
      setStep("choose");
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

  function goBack() {
    setError(null);
    setPreviewCode(null);
    setCode("");

    if (step === "email-code") {
      setStep("email");
      return;
    }

    if (step === "email" || step === "phone") {
      setStep("choose");
      return;
    }

    if (step === "phone-code") {
      setStep("phone");
    }
  }

  const showBack = step === "email" || step === "email-code" || step === "phone" || step === "phone-code";

  return (
    <section
      className={cn(
        "rounded-3xl border border-zinc-800 bg-zinc-900/80 p-5",
        embedded ? "mt-4" : "mt-8",
      )}
    >
      {!embedded && step !== "ready" ? (
        <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Entrar ou criar conta
          </p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-50">
            {stepTitle(step)}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">{stepHint(step)}</p>
          <StepDots step={step} />
        </div>
      ) : null}

      {embedded && step !== "ready" ? (
        <div className="mb-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Sua conta</p>
          <p className="mt-1 text-sm text-zinc-300">
            Entre com e-mail, Google, Apple ou Microsoft. O celular fecha a verificação.
          </p>
        </div>
      ) : null}

      {step === "ready" && name ? (
        <div className="flex items-center justify-between gap-3">
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
      ) : null}

      {showBack ? (
        <button
          type="button"
          onClick={goBack}
          className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-zinc-400"
        >
          <ChevronLeft className="size-3.5" strokeWidth={2.4} />
          Voltar
        </button>
      ) : null}

      {step === "choose" ? (
        <div className="space-y-3">
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              setStep("email");
            }}
          >
            <label className="block text-xs font-medium text-zinc-400">
              E-mail
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
                className="mt-1.5 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-[color-mix(in_srgb,var(--accent)_45%,transparent)]"
              />
            </label>
            <button
              type="submit"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] text-sm font-semibold text-zinc-950"
            >
              <Mail className="size-4" strokeWidth={2.2} />
              Continuar com e-mail
            </button>
          </form>

          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-zinc-800" />
            <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-600">ou</span>
            <span className="h-px flex-1 bg-zinc-800" />
          </div>

          <div className="space-y-2">
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
                className={cn(
                  "flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl px-4 text-sm font-semibold transition disabled:opacity-60",
                  provider.className,
                )}
              >
                {provider.id === "apple" ? (
                  <AppleMark />
                ) : (
                  <span className="inline-flex size-5 items-center justify-center text-base font-bold leading-none">
                    {provider.mark}
                  </span>
                )}
                {busy ? "Abrindo..." : provider.label}
              </button>
            ))}
          </div>

          <p className="pt-1 text-center text-[11px] leading-relaxed text-zinc-500">
            Depois pedimos o celular para achar um cadastro feito pelo WhatsApp.
          </p>
        </div>
      ) : null}

      {step === "email" ? (
        <form
          className="space-y-2"
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
          <label className="block text-xs font-medium text-zinc-400">
            E-mail
            <input
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              className="mt-1.5 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none"
            />
          </label>
          <Submit label="Receber código no e-mail" busy={busy} />
        </form>
      ) : null}

      {step === "email-code" ? (
        <form
          className="space-y-2"
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
          <p className="text-xs text-zinc-400">
            Digite o código enviado para <span className="text-zinc-200">{email}</span>.
          </p>
          <CodeField value={code} onChange={setCode} />
          <Preview code={previewCode} />
          <Submit label="Confirmar e-mail" busy={busy} />
        </form>
      ) : null}

      {step === "phone" ? (
        <form
          className="space-y-2"
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
          <div className="flex items-start gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3 py-3 text-xs text-zinc-400">
            <Smartphone className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" strokeWidth={2} />
            <p>
              Informe o mesmo celular do WhatsApp. Se você já marcou por lá, essa é a sua ficha.
            </p>
          </div>
          <label className="block text-xs font-medium text-zinc-400">
            Celular com DDD
            <input
              type="tel"
              required
              autoComplete="tel"
              autoFocus
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="11999998888"
              className="mt-1.5 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none"
            />
          </label>
          <Submit label="Enviar código no celular" busy={busy} />
        </form>
      ) : null}

      {step === "phone-code" ? (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              const session = await api.confirmCustomerPhone(challengeId, code);
              rememberSession(session);
            });
          }}
        >
          <p className="text-xs text-zinc-400">
            Digite o código enviado para o celular.
          </p>
          <CodeField value={code} onChange={setCode} />
          <Preview code={previewCode} />
          <Submit label="Concluir e entrar" busy={busy} />
        </form>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </section>
  );
}

function stepTitle(step: Step) {
  if (step === "email" || step === "email-code") {
    return "Seu e-mail";
  }

  if (step === "phone" || step === "phone-code") {
    return "Seu celular";
  }

  return "Como você quer entrar?";
}

function stepHint(step: Step) {
  if (step === "email") {
    return "Vamos enviar um código para confirmar o e-mail.";
  }

  if (step === "email-code") {
    return "Confira a caixa de entrada e o spam.";
  }

  if (step === "phone") {
    return "O celular liga sua conta ao WhatsApp do salão.";
  }

  if (step === "phone-code") {
    return "Quase lá — confirme o código para liberar o agendamento.";
  }

  return "Use o e-mail ou a conta Google, Apple ou Microsoft.";
}

function StepDots({ step }: { step: Step }) {
  const phase = step === "choose" || step === "email" || step === "email-code" ? 0 : 1;

  return (
    <div className="mt-4 flex gap-2">
      {["Conta", "Celular"].map((label, index) => (
        <div key={label} className="flex-1">
          <div
            className={cn(
              "h-1 rounded-full",
              index <= phase ? "bg-[var(--accent)]" : "bg-zinc-800",
            )}
          />
          <p
            className={cn(
              "mt-1.5 text-[10px] font-medium uppercase tracking-[0.12em]",
              index <= phase ? "text-zinc-300" : "text-zinc-600",
            )}
          >
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden>
      <path d="M16.365 1.43c0 1.14-.42 2.2-1.2 3.02-.9.95-2.2 1.68-3.4 1.58-.14-1.1.42-2.25 1.18-3.05.9-1 2.35-1.72 3.42-1.55zM20.9 17.3c-.52 1.2-.77 1.73-1.44 2.79-.94 1.45-2.27 3.26-3.92 3.28-1.47.02-1.85-.95-3.85-.94-2 0-2.42.95-3.88.97-1.65.03-2.91-1.66-3.85-3.1-2.63-4.05-2.9-8.8-1.28-11.3 1.15-1.78 2.97-2.82 4.68-2.82 1.74 0 2.83.97 4.27.97 1.4 0 2.25-.98 4.28-.98 1.53 0 3.15.84 4.28 2.29-3.76 2.06-3.15 7.43.71 9.84z" />
    </svg>
  );
}

function CodeField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      inputMode="numeric"
      autoComplete="one-time-code"
      required
      autoFocus
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Código de 6 dígitos"
      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-center text-lg tracking-[0.28em] text-zinc-100 outline-none"
    />
  );
}

function Preview({ code }: { code: string | null }) {
  if (!code) {
    return null;
  }

  return (
    <p className="rounded-2xl bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
      Código de demonstração: <span className="font-semibold text-zinc-100">{code}</span>
    </p>
  );
}

function Submit({ label, busy }: { label: string; busy: boolean }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="min-h-12 w-full rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] text-sm font-semibold text-zinc-950 disabled:opacity-60"
    >
      {busy ? "Aguarde..." : label}
    </button>
  );
}
