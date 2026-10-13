"use client";

import { AdminSessionProvider, useAdminSession } from "@/contexts/admin-session-context";
import { homePathForRole } from "@/lib/admin-rbac";
import { readStoredAdminUser } from "@/lib/admin-session-storage";
import { isDemoMode } from "@/lib/app-mode";
import { DEMO_PRESENTATION_LOGINS } from "@/lib/demo-logins";
import { PLATFORM_SUPER_ADMIN_EMAIL } from "@/lib/platform-auth";
import { api, getAccessToken, getErrorMessage } from "@/services/api";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace(homePathForRole(user.role));
      return;
    }

    const storedUser = readStoredAdminUser();
    const storedToken = getAccessToken();

    if (storedToken && storedUser) {
      setSession({
        accessToken: storedToken,
        user: storedUser,
      });
    }
  }, [router, setSession, user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const session = await api.login({
        email,
        password,
      });

      setSession({
        accessToken: session.accessToken,
        user: session.user,
      });
      router.replace(homePathForRole(session.user.role));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

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
          Entrar no Clubby
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          Super-Admin vai para o painel global. Gestores e equipe seguem para o
          painel do estabelecimento.
        </p>
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
        {error ? (
          <p className="mt-4 text-sm text-red-300">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-60"
        >
          {submitting ? "Entrando..." : "Entrar"}
        </button>
        {isDemoMode() ? (
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
