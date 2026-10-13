"use client";

import { AdminNav } from "@/components/admin-nav";
import { AccentButton, AccentIconWrap } from "@/components/shell/accent-ui";
import { TenantBadge } from "@/components/tenant-brand";
import { useAdminSession } from "@/contexts/admin-session-context";
import { useTenant } from "@/contexts/tenant-context";
import { cn } from "@/lib/cn";
import { PLATFORM_SUPER_ADMIN_EMAIL } from "@/lib/platform-auth";
import {
  DEMO_BARBER_FALLBACK_LOGINS,
  DEMO_BARBER_SLUG,
} from "@/lib/test-env";
import {
  api,
  getErrorMessage,
  type ApiTestSeedResult,
} from "@/services/api";
import {
  CalendarDays,
  Database,
  ExternalLink,
  FlaskConical,
  Loader2,
  Scissors,
  ShieldCheck,
  Smartphone,
  Store,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function TestesBoard() {
  const { tenant, switchTenantSlug, resetTenantSlug } = useTenant();
  const { user, setSession } = useAdminSession();
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiTestSeedResult | null>(null);

  const slug = result?.tenant.slug ?? DEMO_BARBER_SLUG;
  const password =
    result?.password ??
    process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD ??
    "clubby-admin";

  async function seedDatabase() {
    setSeeding(true);
    setError(null);

    try {
      const payload = await api.seedTestEnvironment();
      setResult(payload);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSeeding(false);
    }
  }

  async function openStaffView(
    key: "professional" | "receptionist",
    href: string,
  ) {
    setOpening(key);
    setError(null);

    const login =
      result?.logins[key] ??
      {
        phone:
          key === "professional"
            ? DEMO_BARBER_FALLBACK_LOGINS.professional.phone
            : DEMO_BARBER_FALLBACK_LOGINS.receptionist.phone,
      };

    try {
      switchTenantSlug(slug);
      const session = await api.login({
        slug,
        phone: login.phone,
        password,
      });
      setSession({
        accessToken: session.accessToken,
        user: session.user,
      });
      router.push(href);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setOpening(null);
    }
  }

  async function openSuperAdmin() {
    setOpening("super-admin");
    setError(null);

    try {
      if (user?.role !== "SUPER_ADMIN") {
        resetTenantSlug();
        const session = await api.login({
          email: PLATFORM_SUPER_ADMIN_EMAIL,
          password,
        });
        setSession({
          accessToken: session.accessToken,
          user: session.user,
        });
      }

      router.push("/super-admin");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setOpening(null);
    }
  }

  return (
    <div className="relative flex flex-1 flex-col px-4 pb-8 pt-6 sm:px-6 lg:px-10 xl:px-12">
      <header className="mb-6">
        <TenantBadge />
        <div className="mt-4 flex items-start gap-3">
          <AccentIconWrap className="size-11">
            <FlaskConical className="size-5" />
          </AccentIconWrap>
          <div>
            <h1 className="text-xl font-semibold text-zinc-50">
              Ambiente de testes
            </h1>
            <p className="mt-1 max-w-xl text-sm text-zinc-400">
              Popular o tenant <span className="text-zinc-200">{slug}</span> com
              dados reais e abrir as visões de barbeiro, cliente, recepção e
              super-admin no celular.
            </p>
          </div>
        </div>
      </header>

      <AdminNav className="mb-6 lg:hidden" />

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-100">
              Banco de demonstração
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Apaga e recria apenas o tenant {slug}. O Studio Barbearia
              permanece intacto. Disponível em development e staging.
            </p>
          </div>
          <AccentButton
            disabled={seeding}
            onClick={() => void seedDatabase()}
            className="inline-flex shrink-0 items-center justify-center gap-2"
          >
            {seeding ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Database className="size-4" />
            )}
            {seeding ? "Populando..." : "Popular Banco com Dados de Teste"}
          </AccentButton>
        </div>

        {error ? (
          <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-5">
            <CountCard label="Staff" value={result.counts.staff} />
            <CountCard label="Clientes" value={result.counts.clients} />
            <CountCard label="Serviços" value={result.counts.services} />
            <CountCard label="Agenda" value={result.counts.appointments} />
            <CountCard label="Fila" value={result.counts.waitlist} />
          </div>
        ) : null}

        {result ? (
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-400">
            <p className="font-semibold text-zinc-200">Acessos gerados</p>
            <p className="mt-1">
              Senha de todos os perfis:{" "}
              <span className="font-mono text-zinc-100">{password}</span>
            </p>
            <ul className="mt-2 space-y-1 font-mono text-xs text-zinc-500">
              <li>
                Admin · {result.logins.admin.phone} · {result.logins.admin.email}
              </li>
              <li>
                Recepção · {result.logins.receptionist.phone} ·{" "}
                {result.logins.receptionist.email}
              </li>
              <li>
                Barbeiro · {result.logins.professional.phone} ·{" "}
                {result.logins.professional.email}
              </li>
            </ul>
            <p className="mt-2 text-xs">
              {result.reused
                ? "Tenant anterior foi recriado do zero."
                : "Tenant criado nesta execução."}{" "}
              Contexto atual do painel: {tenant.name}.
            </p>
          </div>
        ) : null}
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <Smartphone className="size-4 text-[var(--accent)]" />
          Acesso rápido no celular
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <QuickCard
            icon={Scissors}
            title="Abrir Visão do Barbeiro"
            description="Entra como Diego Barber e abre a agenda pessoal."
            actionLabel={opening === "professional" ? "Entrando..." : "Abrir painel"}
            disabled={opening !== null}
            onClick={() => void openStaffView("professional", "/admin/meu-painel")}
          />
          <QuickCard
            icon={Store}
            title={`Abrir Visão do Cliente em /${slug}`}
            description="Vitrine pública, agendamento e fila do tenant de testes."
            href={`/${slug}`}
            actionLabel="Abrir vitrine"
            disabled={opening !== null}
          />
          <QuickCard
            icon={CalendarDays}
            title="Abrir Visão da Recepção/Kanban"
            description="Entra como recepção e abre a agenda Kanban com a fila."
            actionLabel={opening === "receptionist" ? "Entrando..." : "Abrir Kanban"}
            disabled={opening !== null}
            onClick={() => void openStaffView("receptionist", "/admin/agenda")}
          />
          <QuickCard
            icon={ShieldCheck}
            title="Abrir Painel Super-Admin"
            description="Rede de tenants, taxas e visão financeira da plataforma."
            actionLabel={opening === "super-admin" ? "Abrindo..." : "Abrir plataforma"}
            disabled={opening !== null}
            onClick={() => void openSuperAdmin()}
          />
        </div>
      </section>
    </div>
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

function QuickCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  href,
  disabled,
  onClick,
}: {
  icon: typeof Scissors;
  title: string;
  description: string;
  actionLabel: string;
  href?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      <AccentIconWrap className="size-10">
        <Icon className="size-4" />
      </AccentIconWrap>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-zinc-100">{title}</p>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
        <span
          className={cn(
            "mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]",
          )}
        >
          {actionLabel}
          <ExternalLink className="size-3" />
        </span>
      </div>
    </>
  );

  const className = cn(
    "flex items-start gap-3 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-900",
    disabled && "pointer-events-none opacity-60",
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" disabled={disabled} onClick={onClick} className={className}>
      {body}
    </button>
  );
}
