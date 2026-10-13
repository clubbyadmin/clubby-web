"use client";

import { LoadingState } from "@/components/api-state";
import { useAdminSession } from "@/contexts/admin-session-context";
import { readStoredAdminUser } from "@/lib/admin-session-storage";
import { PLATFORM_SUPER_ADMIN_EMAIL } from "@/lib/platform-auth";
import { api, getAccessToken, getErrorMessage } from "@/services/api";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type SuperAdminGateProps = {
  children: ReactNode;
};

export function SuperAdminGate({ children }: SuperAdminGateProps) {
  const { user, setSession, clearSession } = useAdminSession();
  const [hydrated, setHydrated] = useState(false);
  const [email, setEmail] = useState(PLATFORM_SUPER_ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setHydrated(true);
      return;
    }

    const storedUser = readStoredAdminUser();
    const storedToken = getAccessToken();

    if (storedToken && storedUser?.role === "SUPER_ADMIN") {
      setSession({
        accessToken: storedToken,
        user: storedUser,
      });
    }

    setHydrated(true);
  }, [setSession, user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const session = await api.login({
        email,
        password,
      });

      if (session.user.role !== "SUPER_ADMIN") {
        clearSession();
        setError("Este acesso não é de Super-Admin da plataforma Clubby.");
        return;
      }

      setSession({
        accessToken: session.accessToken,
        user: session.user,
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return <LoadingState message="Carregando painel da plataforma..." />;
  }

  if (user?.role === "SUPER_ADMIN") {
    return children;
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
          Super-Admin Clubby
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          Acesso global da plataforma. Acima dos administradores de cada
          estabelecimento.
        </p>
        <label className="mt-8 block">
          <span className="mb-1.5 block text-xs font-medium text-zinc-400">
            E-mail
          </span>
          <input
            type="email"
            required
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
          {submitting ? "Entrando..." : "Entrar no painel global"}
        </button>
      </form>
    </div>
  );
}
