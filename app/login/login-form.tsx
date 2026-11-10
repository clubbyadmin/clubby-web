"use client";

import { AdminSessionProvider, useAdminSession } from "@/contexts/admin-session-context";
import {
  homePathForRole,
  type AdminSessionUser,
} from "@/lib/admin-rbac";
import { readStoredAdminUser } from "@/lib/admin-session-storage";
import { isDemoMode } from "@/lib/app-mode";
import { DEMO_PRESENTATION_LOGINS } from "@/lib/demo-logins";
import { PLATFORM_SUPER_ADMIN_EMAIL } from "@/lib/platform-auth";
import { api, getAccessToken, getErrorMessage } from "@/services/api";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const DEVICE_TOKEN_KEY = "clubby.admin.deviceToken";

type Mode = "login" | "forgot" | "reset" | "mfa" | "change-password";

type StaffProvider = "google" | "apple" | "microsoft";

const PROVIDERS: Array<{
  id: StaffProvider;
  label: string;
  mark: string;
  className: string;
}> = [
  {
    id: "google",
    label: "Continuar com Google",
    mark: "G",
    className: "bg-white text-zinc-900 hover:bg-zinc-100",
  },
  {
    id: "microsoft",
    label: "Continuar com Outlook / Microsoft",
    mark: "M",
    className: "bg-[#2F2F2F] text-zinc-50 hover:bg-zinc-800 ring-1 ring-zinc-700",
  },
  {
    id: "apple",
    label: "Continuar com Apple",
    mark: "",
    className: "bg-zinc-100 text-zinc-950 hover:bg-white",
  },
];

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

export function LoginPage() {
  return (
    <AdminSessionProvider>
      <LoginForm />
    </AdminSessionProvider>
  );
}

function LoginForm() {
  const router = useRouter();
  const { user, setSession } = useAdminSession();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState(PLATFORM_SUPER_ADMIN_EMAIL);
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
    // finishSession is stable enough for mount-only OAuth return handling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user && mode !== "change-password" && !user.mustChangePassword) {
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
  }, [mode, router, setSession, user]);

  function finishSession(session: {
    accessToken: string;
    deviceToken?: string | null;
    mustChangePassword?: boolean;
    user: AdminSessionUser & { mustChangePassword?: boolean };
  }) {
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
        const result = await api.requestPasswordReset(email);
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
        const session = await api.resetPassword({
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

      const result = await api.login({
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

  const title =
    mode === "change-password"
      ? "Defina sua nova senha"
      : mode === "forgot"
        ? "Esqueci minha senha"
        : mode === "reset"
          ? "Criar nova senha"
          : mode === "mfa"
            ? "Confirme o acesso"
            : "Entrar no Clubby";

  const subtitle =
    mode === "change-password"
      ? "Por segurança, troque a senha temporária antes de entrar no painel."
      : mode === "forgot"
        ? "Informe o e-mail cadastrado. Se existir conta de gestão, enviamos um código para redefinir a senha."
        : mode === "reset"
          ? `Digite o código enviado para ${emailHint ?? "seu e-mail"} e escolha uma nova senha.`
          : mode === "mfa"
            ? `Enviamos um código para ${emailHint ?? "seu e-mail"}. Em aparelhos conhecidos, o próximo login pode pular esta etapa.`
            : "Super-Admin vai para o painel global. Gestores e equipe usam o e-mail cadastrado no salão.";

  const submitLabel = submitting
    ? "Aguarde..."
    : mode === "change-password"
      ? "Salvar senha e entrar"
      : mode === "forgot"
        ? "Enviar código"
        : mode === "reset"
          ? "Salvar nova senha"
          : mode === "mfa"
            ? "Confirmar código"
            : "Entrar";

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-5 py-16">
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="w-full max-w-md rounded-3xl border border-zinc-800/80 bg-zinc-950/80 p-8 shadow-2xl shadow-black/40"
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/25">
          <ShieldCheck className="size-6" strokeWidth={1.8} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-zinc-50">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">{subtitle}</p>

        {mode === "change-password" ? (
          <>
            <label className="mt-8 block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                Nova senha
              </span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/20"
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                Confirmar senha
              </span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/20"
              />
            </label>
          </>
        ) : null}

        {mode === "login" ? (
          <>
            <label className="mt-8 block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                E-mail
              </span>
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/20"
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                Senha
              </span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/20"
              />
            </label>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                className="text-xs font-semibold text-amber-300/90 hover:text-amber-200"
                onClick={() => {
                  setError(null);
                  setInfo(null);
                  setMode("forgot");
                }}
              >
                Esqueci minha senha
              </button>
            </div>
          </>
        ) : null}

        {mode === "forgot" ? (
          <label className="mt-8 block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">
              E-mail
            </span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/20"
            />
          </label>
        ) : null}

        {mode === "reset" ? (
          <>
            <label className="mt-8 block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                Código de 6 dígitos
              </span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/20"
              />
              {previewCode ? (
                <p className="mt-2 rounded-xl bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
                  Código de demonstração:{" "}
                  <span className="font-semibold text-zinc-100">{previewCode}</span>
                </p>
              ) : null}
            </label>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                Nova senha
              </span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/20"
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                Confirmar senha
              </span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/20"
              />
            </label>
          </>
        ) : null}

        {mode === "mfa" ? (
          <label className="mt-8 block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">
              Código de 6 dígitos
            </span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/20"
            />
            {previewCode ? (
              <p className="mt-2 rounded-xl bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
                Código de demonstração:{" "}
                <span className="font-semibold text-zinc-100">{previewCode}</span>
              </p>
            ) : null}
          </label>
        ) : null}

        {info ? <p className="mt-4 text-sm text-zinc-300">{info}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-60"
        >
          {submitLabel}
        </button>

        {mode !== "login" && mode !== "change-password" ? (
          <button
            type="button"
            className="mt-3 w-full text-xs font-semibold text-zinc-400 hover:text-zinc-200"
            onClick={() => {
              setMode("login");
              setChallengeId(null);
              setCode("");
              setPreviewCode(null);
              setEmailHint(null);
              setNewPassword("");
              setConfirmPassword("");
              setError(null);
              setInfo(null);
            }}
          >
            Voltar ao login
          </button>
        ) : null}

        {mode === "login" ? (
          <>
            <div className="mt-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-zinc-800" />
              <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-600">
                ou
              </span>
              <span className="h-px flex-1 bg-zinc-800" />
            </div>
            <div className="mt-4 space-y-2">
              {PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  disabled={Boolean(oauthBusy) || submitting}
                  onClick={() => void startProvider(provider.id)}
                  className={`flex min-h-11 w-full items-center justify-center gap-3 rounded-xl px-4 text-sm font-semibold transition disabled:opacity-60 ${provider.className}`}
                >
                  {provider.id === "apple" ? (
                    <AppleMark />
                  ) : (
                    <span className="inline-flex size-5 items-center justify-center text-base font-bold leading-none">
                      {provider.mark}
                    </span>
                  )}
                  {oauthBusy === provider.id ? "Abrindo..." : provider.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-zinc-500">
              Use a mesma conta social do e-mail cadastrado na gestão do salão.
            </p>
          </>
        ) : null}

        {isDemoMode() && mode === "login" ? (
          <div className="mt-6 border-t border-zinc-800 pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Atalhos da demonstração
            </p>
            <ul className="mt-3 space-y-2">
              {DEMO_PRESENTATION_LOGINS.map((login) => (
                <li key={login.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(login.email);
                      setPassword(login.password);
                      setError(null);
                      setInfo(null);
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-left hover:border-amber-400/30"
                  >
                    <span>
                      <span className="block text-xs font-medium text-zinc-200">
                        {login.label}
                      </span>
                      <span className="block text-[11px] text-zinc-500">
                        {login.email}
                      </span>
                    </span>
                    <span className="text-[11px] text-amber-300">
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
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-current">
      <path d="M16.365 1.43c0 1.14-.42 2.2-1.13 3.02-.74.86-1.97 1.52-3.15 1.43-.14-1.1.42-2.26 1.12-3.04.74-.86 2.04-1.5 3.16-1.41zM20.5 17.2c-.58 1.34-.86 1.93-1.61 3.11-1.05 1.64-2.53 3.68-4.37 3.7-1.63.02-2.05-1.06-4.27-1.05-2.22.01-2.68 1.07-4.32 1.05-1.84-.02-3.25-1.86-4.3-3.5C-.12 16.9-.9 12.7.95 9.78c1.16-1.84 3-2.92 4.72-2.92 1.76 0 2.87 1.08 4.33 1.08 1.41 0 2.27-1.09 4.32-1.09 1.54 0 3.17.84 4.33 2.29-3.8 2.08-3.18 7.5.85 8.06z" />
    </svg>
  );
}
