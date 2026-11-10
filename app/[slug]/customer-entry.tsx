"use client";

import { ProviderIcon, type OAuthProviderId } from "@/components/auth/provider-icons";
import { useTenant } from "@/contexts/tenant-context";
import {
  readStoredAdminUser,
  writeStoredAdminUser,
} from "@/lib/admin-session-storage";
import { cn } from "@/lib/cn";
import { api, getErrorMessage, setAccessToken } from "@/services/api";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Step =
  | "choose"
  | "forgot"
  | "reset"
  | "email-code"
  | "phone"
  | "phone-code"
  | "ready";

const PROVIDERS: Array<{ id: OAuthProviderId; label: string }> = [
  { id: "google", label: "Google" },
  { id: "microsoft", label: "Microsoft" },
  { id: "apple", label: "Apple" },
];

const fieldClass =
  "h-12 w-full rounded-2xl border border-zinc-800/90 bg-zinc-950/60 px-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-[color-mix(in_srgb,var(--accent)_50%,transparent)] focus:bg-zinc-950 focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_18%,transparent)]";

type CustomerEntryProps = {
  /** Quando true, remove o título interno (o shell já explica). */
  embedded?: boolean;
};

export function CustomerEntry({ embedded = false }: CustomerEntryProps) {
  const { tenant } = useTenant();
  const [step, setStep] = useState<Step>("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [pendingToken, setPendingToken] = useState("");
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<OAuthProviderId | null>(null);

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
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
  }, [tenant.id]);

  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setInfo(null);

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

  function continueWithPending(token: string) {
    setPendingToken(token);
    setCode("");
    setPreviewCode(null);
    setStep("phone");
  }

  function goBack() {
    setError(null);
    setInfo(null);
    setPreviewCode(null);
    setCode("");
    setNewPassword("");
    setConfirmPassword("");

    if (step === "forgot" || step === "reset" || step === "email-code") {
      setStep("choose");
      setChallengeId("");
      return;
    }

    if (step === "phone") {
      setStep("choose");
      return;
    }

    if (step === "phone-code") {
      setStep("phone");
    }
  }

  async function startProvider(provider: OAuthProviderId) {
    setError(null);
    setOauthBusy(provider);

    try {
      const started = await api.startCustomerProvider(provider, tenant.slug);
      window.location.assign(started.url);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setOauthBusy(null);
    }
  }

  const showBack =
    step === "forgot" ||
    step === "reset" ||
    step === "email-code" ||
    step === "phone" ||
    step === "phone-code";

  const title =
    step === "forgot"
      ? "Recuperar acesso"
      : step === "reset"
        ? "Definir senha"
        : step === "email-code"
          ? "Confirme o e-mail"
          : step === "phone"
            ? "Seu celular"
            : step === "phone-code"
              ? "Confirme o celular"
              : "Acesso do cliente";

  const subtitle =
    step === "forgot"
      ? "Enviamos um código se o e-mail estiver cadastrado neste salão."
      : step === "reset"
        ? `Código enviado para ${emailHint ?? "seu e-mail"}.`
        : step === "email-code"
          ? `Código enviado para ${email || "seu e-mail"}.`
          : step === "phone"
            ? "Use o mesmo número do WhatsApp para achar seu cadastro."
            : step === "phone-code"
              ? "Digite o código enviado para o celular."
              : "Entre para agendar e acompanhar seus horários.";

  const initial = tenant.name.trim().charAt(0).toUpperCase() || "C";

  if (step === "ready" && name) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3",
          embedded ? "mt-4 rounded-2xl border border-zinc-800 px-4 py-3" : "px-1",
        )}
      >
        <p className="text-sm text-zinc-100">Você entrou como {name}.</p>
        <button
          type="button"
          className="text-xs font-medium text-zinc-400 transition hover:text-zinc-200"
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
    );
  }

  const form = (
    <>
      {!embedded ? (
        <div className="animate-portal-fade">
          <p className="font-[family-name:var(--font-portal-display)] text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
            {tenant.name}
          </p>
          <h1 className="mt-3 text-lg font-medium text-zinc-100 sm:text-xl">
            {title}
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
            {subtitle}
          </p>
        </div>
      ) : (
        <div className="mb-1">
          <h2 className="text-lg font-medium text-zinc-50">{title}</h2>
          <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
        </div>
      )}

      <div
        className={cn(
          "space-y-4",
          embedded ? "mt-5" : "mt-8 animate-portal-rise",
        )}
      >
        {step === "choose" ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              {PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  disabled={Boolean(oauthBusy) || busy}
                  onClick={() => void startProvider(provider.id)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/50 text-xs font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-900 disabled:opacity-50"
                  aria-label={`Continuar com ${provider.label}`}
                >
                  <ProviderIcon id={provider.id} />
                  <span className="hidden sm:inline">
                    {oauthBusy === provider.id ? "…" : provider.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <span className="h-px flex-1 bg-zinc-800/80" />
              <span className="text-[11px] tracking-[0.12em] text-zinc-600">
                e-mail
              </span>
              <span className="h-px flex-1 bg-zinc-800/80" />
            </div>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  if (password.trim()) {
                    const result = await api.loginCustomer(
                      tenant.slug,
                      email,
                      password,
                    );
                    if ("accessToken" in result) {
                      rememberSession(result);
                      return;
                    }
                    continueWithPending(result.pendingToken);
                    return;
                  }

                  const started = await api.startCustomerEmail(
                    tenant.slug,
                    email,
                  );
                  setChallengeId(started.challengeId);
                  setPreviewCode(started.previewCode);
                  setCode("");
                  setStep("email-code");
                });
              }}
            >
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                  E-mail
                </span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="seu@email.com"
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-zinc-400">
                    Senha
                  </span>
                  <button
                    type="button"
                    className="text-xs font-medium text-[color-mix(in_srgb,var(--accent)_92%,white)] transition hover:brightness-110"
                    onClick={() => {
                      setError(null);
                      setInfo(null);
                      setStep("forgot");
                    }}
                  >
                    Esqueci a senha
                  </button>
                </div>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Opcional no primeiro acesso"
                  className={fieldClass}
                />
              </label>
              <Submit label="Entrar" busy={busy} />
            </form>
          </>
        ) : null}

        {step === "forgot" ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                const result = await api.requestCustomerPasswordReset(
                  tenant.slug,
                  email,
                );
                setEmailHint(result.emailHint);
                setPreviewCode(result.previewCode);
                setInfo(result.message);
                if (result.challengeId) {
                  setChallengeId(result.challengeId);
                  setCode("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setStep("reset");
                }
              });
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                E-mail
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={fieldClass}
              />
            </label>
            <Submit label="Enviar código" busy={busy} />
          </form>
        ) : null}

        {step === "reset" ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                if (!challengeId) {
                  setError("Peça um novo código em “Esqueci a senha”.");
                  setStep("forgot");
                  return;
                }
                if (newPassword.length < 8) {
                  setError("A nova senha precisa ter ao menos 8 caracteres.");
                  return;
                }
                if (newPassword !== confirmPassword) {
                  setError("A confirmação da senha não confere.");
                  return;
                }
                const result = await api.resetCustomerPassword({
                  challengeId,
                  code,
                  newPassword,
                });
                if ("accessToken" in result) {
                  rememberSession(result);
                  return;
                }
                continueWithPending(result.pendingToken);
              });
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                Código
              </span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className={fieldClass}
              />
              <Preview code={previewCode} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                Nova senha
              </span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                Confirmar
              </span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={fieldClass}
              />
            </label>
            <Submit label="Salvar senha" busy={busy} />
          </form>
        ) : null}

        {step === "email-code" ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                const verified = await api.verifyCustomerEmail(
                  challengeId,
                  code,
                );
                setPendingToken(verified.pendingToken);
                setCode("");
                setPreviewCode(null);
                setStep("phone");
              });
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                Código
              </span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                autoFocus
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="6 dígitos"
                className={`${fieldClass} text-center tracking-[0.28em]`}
              />
            </label>
            <Preview code={previewCode} />
            <Submit label="Confirmar e-mail" busy={busy} />
          </form>
        ) : null}

        {step === "phone" ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                const started = await api.startCustomerPhone(
                  pendingToken,
                  phone,
                );
                setChallengeId(started.challengeId);
                setPreviewCode(started.previewCode);
                setCode("");
                setStep("phone-code");
              });
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                Celular com DDD
              </span>
              <input
                type="tel"
                required
                autoComplete="tel"
                autoFocus
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="11999998888"
                className={fieldClass}
              />
            </label>
            <Submit label="Enviar código" busy={busy} />
          </form>
        ) : null}

        {step === "phone-code" ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                const session = await api.confirmCustomerPhone(
                  challengeId,
                  code,
                );
                rememberSession(session);
              });
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                Código
              </span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                autoFocus
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="6 dígitos"
                className={`${fieldClass} text-center tracking-[0.28em]`}
              />
            </label>
            <Preview code={previewCode} />
            <Submit label="Concluir e entrar" busy={busy} />
          </form>
        ) : null}

        {info ? (
          <p className="text-sm leading-relaxed text-zinc-400">{info}</p>
        ) : null}
        {error ? (
          <p className="text-sm leading-relaxed text-red-300/95">{error}</p>
        ) : null}
      </div>
    </>
  );

  if (embedded) {
    return (
      <section className="mt-4 rounded-3xl border border-zinc-800/80 bg-zinc-950/50 p-5">
        {showBack ? (
          <button
            type="button"
            onClick={goBack}
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-zinc-100"
          >
            <ArrowLeft className="size-3.5" />
            Voltar
          </button>
        ) : null}
        {form}
      </section>
    );
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col px-5 py-8 sm:px-6 sm:py-10">
      <header className="flex items-center justify-between gap-3 animate-portal-fade">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] text-base font-black text-zinc-950 shadow-lg shadow-[color-mix(in_srgb,var(--accent)_25%,transparent)]">
            {initial}
          </span>
          <span className="truncate font-[family-name:var(--font-portal-display)] text-xl font-semibold tracking-tight">
            {tenant.name}
          </span>
        </div>
        {showBack ? (
          <button
            type="button"
            onClick={goBack}
            className="inline-flex shrink-0 items-center gap-1.5 text-sm text-zinc-400 transition hover:text-zinc-100"
          >
            <ArrowLeft className="size-3.5" />
            Voltar
          </button>
        ) : (
          <Link
            href="/"
            className="shrink-0 text-sm text-zinc-500 transition hover:text-zinc-200"
          >
            Portal
          </Link>
        )}
      </header>

      <div className="flex flex-1 flex-col justify-center py-10 sm:py-14">
        {form}
      </div>
    </div>
  );
}

function Preview({ code }: { code: string | null }) {
  if (!code) {
    return null;
  }

  return (
    <p className="mt-2 text-xs text-zinc-500">
      Demo: <span className="font-medium text-zinc-200">{code}</span>
    </p>
  );
}

function Submit({ label, busy }: { label: string; busy: boolean }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-6 text-sm font-semibold text-zinc-950 shadow-lg shadow-[color-mix(in_srgb,var(--accent)_20%,transparent)] transition hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
    >
      {busy ? "Aguarde..." : label}
      {!busy ? <ArrowRight className="size-4" /> : null}
    </button>
  );
}
