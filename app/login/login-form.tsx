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
  const [email, setEmail] = useState(PLATFORM_SUPER_ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && !user.mustChangePassword && !mustChangePassword) {
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
        setMustChangePassword(true);
        return;
      }
      setSession({
        accessToken: storedToken,
        user: storedUser,
      });
    }
  }, [mustChangePassword, router, setSession, user]);

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
      setMustChangePassword(true);
      setNewPassword("");
      setConfirmPassword("");
      return;
    }

    router.replace(homePathForRole(nextUser.role));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mustChangePassword) {
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

      if (challengeId) {
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

  const title = mustChangePassword
    ? "Defina sua nova senha"
    : challengeId
      ? "Confirme o acesso"
      : "Entrar no Clubby";

  const subtitle = mustChangePassword
    ? "Por segurança, troque a senha temporária antes de entrar no painel."
    : challengeId
      ? `Enviamos um código para ${emailHint ?? "seu e-mail"}. Em aparelhos conhecidos, o próximo login pode pular esta etapa.`
      : "Super-Admin vai para o painel global. Gestores e equipe usam o e-mail cadastrado no salão.";

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

        {mustChangePassword ? (
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
        ) : !challengeId ? (
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
          </>
        ) : (
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
            <button
              type="button"
              className="mt-3 text-xs font-semibold text-zinc-400"
              onClick={() => {
                setChallengeId(null);
                setCode("");
                setPreviewCode(null);
                setEmailHint(null);
                setError(null);
              }}
            >
              Voltar
            </button>
          </label>
        )}

        {error ? (
          <p className="mt-4 text-sm text-red-300">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-60"
        >
          {submitting
            ? "Aguarde..."
            : mustChangePassword
              ? "Salvar senha e entrar"
              : challengeId
                ? "Confirmar código"
                : "Entrar"}
        </button>
        {isDemoMode() && !challengeId && !mustChangePassword ? (
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
