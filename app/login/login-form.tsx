"use client";

import { AdminSessionProvider, useAdminSession } from "@/contexts/admin-session-context";
import {
  homePathForRole,
  type AdminSessionUser,
} from "@/lib/admin-rbac";
import { readStoredAdminUser } from "@/lib/admin-session-storage";
import { isDemoMode } from "@/lib/app-mode";
import {
  DEMO_PLATFORM_LOGINS,
  DEMO_STAFF_LOGINS,
} from "@/lib/demo-logins";
import { ProviderIcon } from "@/components/auth/provider-icons";
import { PLATFORM_SUPER_ADMIN_EMAIL } from "@/lib/platform-auth";
import { api, getAccessToken, getErrorMessage } from "@/services/api";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const DEVICE_TOKEN_KEY = "clubby.admin.deviceToken";

type Mode = "login" | "forgot" | "reset" | "mfa" | "change-password";
type Audience = "staff" | "platform";

type StaffProvider = "google" | "apple" | "microsoft";

const PROVIDERS: Array<{
  id: StaffProvider;
  label: string;
}> = [
  { id: "google", label: "Google" },
  { id: "microsoft", label: "Microsoft" },
  { id: "apple", label: "Apple" },
];

const fieldClass =
  "h-12 w-full rounded-2xl border border-zinc-800/90 bg-zinc-950/60 px-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-300/50 focus:bg-zinc-950 focus:ring-2 focus:ring-amber-300/15";

function readDeviceToken() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return localStorage.getItem(DEVICE_TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeDeviceToken(token: string | null | undefined) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (token) {
      localStorage.setItem(DEVICE_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(DEVICE_TOKEN_KEY);
    }
  } catch {
    /* ignore */
  }
}

function clearOAuthHash() {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  if (!url.hash) {
    return;
  }

  url.hash = "";
  window.history.replaceState({}, "", `${url.pathname}${url.search}`);
}

export function LoginPage({ audience = "staff" }: { audience?: Audience }) {
  return (
    <AdminSessionProvider>
      <LoginForm audience={audience} />
    </AdminSessionProvider>
  );
}

function LoginForm({ audience }: { audience: Audience }) {
  const router = useRouter();
  const { user, setSession } = useAdminSession();
  const isPlatform = audience === "platform";
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState(
    isPlatform ? PLATFORM_SUPER_ADMIN_EMAIL : "",
  );
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<StaffProvider | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) {
      return;
    }

    const params = new URLSearchParams(hash);
    const gestaoErro = params.get("gestao-erro");
    const gestao = params.get("gestao");

    if (gestaoErro) {
      setError(gestaoErro);
      clearOAuthHash();
      return;
    }

    if (!gestao) {
      return;
    }

    try {
      const session = JSON.parse(gestao) as {
        accessToken: string;
        deviceToken?: string | null;
        mustChangePassword?: boolean;
        user: AdminSessionUser & { mustChangePassword?: boolean };
      };
      clearOAuthHash();
      finishSession(session);
    } catch {
      setError("Não foi possível concluir a entrada com a conta social.");
      clearOAuthHash();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user && mode !== "change-password" && !user.mustChangePassword) {
      if (isPlatform && user.role !== "SUPER_ADMIN") {
        return;
      }
      if (!isPlatform && user.role === "SUPER_ADMIN") {
        return;
      }
      router.replace(homePathForRole(user.role));
      return;
    }

    const storedUser = readStoredAdminUser();
    const storedToken = getAccessToken();

    if (
      storedToken &&
      storedUser &&
      storedUser.role !== "CUSTOMER" &&
      !user
    ) {
      const roleOk = isPlatform
        ? storedUser.role === "SUPER_ADMIN"
        : storedUser.role !== "SUPER_ADMIN";

      if (!roleOk) {
        return;
      }

      if (storedUser.mustChangePassword) {
        setSession({ accessToken: storedToken, user: storedUser });
        setMode("change-password");
        return;
      }
      setSession({
        accessToken: storedToken,
        user: storedUser,
      });
    }
  }, [isPlatform, mode, router, setSession, user]);

  function finishSession(session: {
    accessToken: string;
    deviceToken?: string | null;
    mustChangePassword?: boolean;
    user: AdminSessionUser & { mustChangePassword?: boolean };
  }) {
    const role = session.user.role;

    if (isPlatform && role !== "SUPER_ADMIN") {
      setError("Esta conta não tem acesso à plataforma.");
      return;
    }

    if (!isPlatform && role === "SUPER_ADMIN") {
      setError("Use o link de acesso à plataforma para esta conta.");
      return;
    }

    writeDeviceToken(session.deviceToken);
    const nextUser: AdminSessionUser = {
      ...session.user,
      mustChangePassword:
        session.mustChangePassword ?? session.user.mustChangePassword,
    };
    setSession({
      accessToken: session.accessToken,
      user: nextUser,
    });

    if (nextUser.mustChangePassword) {
      setMode("change-password");
      setNewPassword("");
      setConfirmPassword("");
      return;
    }

    router.replace(homePathForRole(nextUser.role));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    try {
      if (mode === "change-password") {
        if (newPassword.length < 8) {
          setError("A nova senha precisa ter ao menos 8 caracteres.");
          return;
        }
        if (newPassword !== confirmPassword) {
          setError("A confirmação da senha não confere.");
          return;
        }
        const session = await api.changePassword({ newPassword });
        finishSession({
          ...session,
          user: { ...session.user, mustChangePassword: false },
          mustChangePassword: false,
        });
        return;
      }

      if (mode === "forgot") {
        const result = isPlatform
          ? await api.requestPlatformPasswordReset(email)
          : await api.requestPasswordReset(email);
        setEmailHint(result.emailHint);
        setPreviewCode(result.previewCode);
        setInfo(result.message);
        if (result.challengeId) {
          setChallengeId(result.challengeId);
          setCode("");
          setNewPassword("");
          setConfirmPassword("");
          setMode("reset");
        }
        return;
      }

      if (mode === "reset") {
        if (!challengeId) {
          setError("Peça um novo código em “Esqueci minha senha”.");
          setMode("forgot");
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
        const session = isPlatform
          ? await api.resetPlatformPassword({
              challengeId,
              code,
              newPassword,
            })
          : await api.resetPassword({
              challengeId,
              code,
              newPassword,
            });
        finishSession(session);
        return;
      }

      if (mode === "mfa" && challengeId) {
        const session = await api.verifyStaffMfa({
          challengeId,
          code,
          trustDevice: true,
        });
        finishSession(session);
        return;
      }

      const result = isPlatform
        ? await api.loginPlatform({
            email,
            password,
            deviceToken: readDeviceToken(),
          })
        : await api.login({
            email,
            password,
            deviceToken: readDeviceToken(),
          });

      if ("mfaRequired" in result && result.mfaRequired) {
        setChallengeId(result.challengeId);
        setEmailHint(result.emailHint);
        setPreviewCode(result.previewCode);
        setCode("");
        setMode("mfa");
        return;
      }

      if ("accessToken" in result && result.user?.role) {
        finishSession(result);
        return;
      }

      setError(
        "O login não retornou sessão completa. Confirme o SMTP e tente de novo.",
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  async function startProvider(provider: StaffProvider) {
    setError(null);
    setInfo(null);
    setOauthBusy(provider);

    try {
      const started = await api.startStaffProvider(provider);
      window.location.assign(started.url);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setOauthBusy(null);
    }
  }

  function backToLogin() {
    setMode("login");
    setChallengeId(null);
    setCode("");
    setPreviewCode(null);
    setEmailHint(null);
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setInfo(null);
  }

  const title =
    mode === "change-password"
      ? "Nova senha"
      : mode === "forgot"
        ? "Recuperar acesso"
        : mode === "reset"
          ? "Definir senha"
          : mode === "mfa"
            ? "Verificação"
            : isPlatform
              ? "Acesso à plataforma"
              : "Acesso à gestão";

  const subtitle =
    mode === "change-password"
      ? "Troque a senha temporária para liberar o painel."
      : mode === "forgot"
        ? "Enviamos um código se o e-mail estiver cadastrado."
        : mode === "reset"
          ? `Código enviado para ${emailHint ?? "seu e-mail"}.`
          : mode === "mfa"
            ? `Código enviado para ${emailHint ?? "seu e-mail"}.`
            : isPlatform
              ? "Entre com a conta da operação Clubby."
              : "Use o e-mail cadastrado no seu estabelecimento.";

  const demoLogins = isPlatform ? DEMO_PLATFORM_LOGINS : DEMO_STAFF_LOGINS;

  const submitLabel = submitting
    ? "Aguarde..."
    : mode === "change-password"
      ? "Salvar e entrar"
      : mode === "forgot"
        ? "Enviar código"
        : mode === "reset"
          ? "Salvar senha"
          : mode === "mfa"
            ? "Confirmar"
            : "Entrar";

  return (
    <div className="relative flex min-h-full flex-1 overflow-hidden bg-zinc-950 text-zinc-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.16),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(245,158,11,0.1),_transparent_45%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-20 size-72 rounded-full bg-amber-400/10 blur-3xl motion-safe:animate-pulse"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 bottom-0 size-80 rounded-full bg-orange-500/10 blur-3xl"
      />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8 sm:px-6 sm:py-12">
        <header className="flex items-center justify-between gap-3 animate-portal-fade">
          <Link href="/" className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-base font-black text-zinc-950 shadow-lg shadow-amber-500/20">
              C
            </span>
            <span className="font-[family-name:var(--font-portal-display)] text-xl font-semibold tracking-tight">
              Clubby
            </span>
          </Link>
          {mode !== "login" && mode !== "change-password" ? (
            <button
              type="button"
              onClick={backToLogin}
              className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-zinc-100"
            >
              <ArrowLeft className="size-3.5" />
              Voltar
            </button>
          ) : (
            <Link
              href="/"
              className="text-sm text-zinc-500 transition hover:text-zinc-200"
            >
              Portal
            </Link>
          )}
        </header>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex flex-1 flex-col justify-center py-10 sm:py-14"
        >
          <div className="animate-portal-fade">
            <p className="font-[family-name:var(--font-portal-display)] text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
              Clubby
            </p>
            <h1 className="mt-3 text-lg font-medium text-zinc-100 sm:text-xl">
              {title}
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
              {subtitle}
            </p>
          </div>

          <div className="mt-8 space-y-4 animate-portal-rise">
            {mode === "login" ? (
              <>
                {!isPlatform ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {PROVIDERS.map((provider) => (
                        <button
                          key={provider.id}
                          type="button"
                          disabled={Boolean(oauthBusy) || submitting}
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
                  </>
                ) : null}

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                    E-mail
                  </span>
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
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
                      className="text-xs font-medium text-amber-300/90 transition hover:text-amber-200"
                      onClick={() => {
                        setError(null);
                        setInfo(null);
                        setMode("forgot");
                      }}
                    >
                      Esqueci a senha
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={fieldClass}
                  />
                </label>
              </>
            ) : null}

            {mode === "forgot" ? (
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                  E-mail
                </span>
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={fieldClass}
                />
              </label>
            ) : null}

            {mode === "change-password" || mode === "reset" ? (
              <>
                {mode === "reset" ? (
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
                    {previewCode ? (
                      <p className="mt-2 text-xs text-zinc-500">
                        Demo:{" "}
                        <span className="font-medium text-zinc-200">
                          {previewCode}
                        </span>
                      </p>
                    ) : null}
                  </label>
                ) : null}
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
              </>
            ) : null}

            {mode === "mfa" ? (
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Código de 6 dígitos
                </span>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  className={fieldClass}
                />
                {previewCode ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    Demo:{" "}
                    <span className="font-medium text-zinc-200">{previewCode}</span>
                  </p>
                ) : null}
              </label>
            ) : null}

            {info ? (
              <p className="text-sm leading-relaxed text-zinc-400">{info}</p>
            ) : null}
            {error ? (
              <p className="text-sm leading-relaxed text-red-300/95">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-6 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/20 transition hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
            >
              {submitLabel}
              {!submitting ? <ArrowRight className="size-4" /> : null}
            </button>
          </div>

          {isDemoMode() && mode === "login" ? (
            <div className="mt-10 border-t border-zinc-800/80 pt-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-600">
                Demonstração
              </p>
              <ul className="mt-3 space-y-1.5">
                {demoLogins.map((login) => (
                  <li key={login.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(login.email);
                        setPassword(login.password);
                        setError(null);
                        setInfo(null);
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm transition hover:bg-zinc-900/70"
                    >
                      <span className="text-zinc-300">{login.label}</span>
                      <span className="text-[11px] text-zinc-600">
                        {login.destination}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
