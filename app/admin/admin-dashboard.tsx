"use client";

import { ErrorState, LoadingState } from "@/components/api-state";
import { AdminNav } from "@/components/admin-nav";
import { AccentIconWrap } from "@/components/shell/accent-ui";
import { TenantBadge } from "@/components/tenant-brand";
import { useTenant } from "@/contexts/tenant-context";
import { isDemoMode } from "@/lib/app-mode";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/mock-data";
import {
  api,
  getErrorMessage,
  mapApiProfessional,
  mapApiService,
} from "@/services/api";
import {
  CalendarDays,
  Palette,
  Scissors,
  UserRound,
  Users,
} from "lucide-react";
import { useCallback, useState } from "react";

type AdminTab = "overview" | "team" | "services";

const tabs: { id: AdminTab; label: string }[] = [
  { id: "overview", label: "Visão geral" },
  { id: "team", label: "Equipe" },
  { id: "services", label: "Serviços" },
];

const themePresets = [
  { name: "Âmbar", primaryColor: "#fbbf24", primaryColorStrong: "#f59e0b" },
  { name: "Esmeralda", primaryColor: "#34d399", primaryColorStrong: "#10b981" },
  { name: "Azul", primaryColor: "#60a5fa", primaryColorStrong: "#3b82f6" },
  { name: "Rose", primaryColor: "#fb7185", primaryColorStrong: "#f43f5e" },
];

export function AdminDashboard() {
  const { tenant, updateTheme } = useTenant();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [staff, setStaff] = useState<
    ReturnType<typeof mapApiProfessional>[]
  >([]);
  const [services, setServices] = useState<
    ReturnType<typeof mapApiService>[]
  >([]);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const tenantId = tenant.id === "local" ? undefined : tenant.id;

  const loadAdminData = useCallback(async () => {
    setLoadingData(true);
    setDataError(null);

    try {
      const [staffResponse, servicesResponse] = await Promise.all([
        api.getUsers({ role: "PROFESSIONAL", tenantId }),
        api.getServices(tenantId),
      ]);

      setStaff(staffResponse.map(mapApiProfessional));
      setServices(servicesResponse.map(mapApiService));
    } catch (requestError) {
      setDataError(getErrorMessage(requestError));
    } finally {
      setLoadingData(false);
    }
  }, [tenantId]);

  function handleTabChange(tab: AdminTab) {
    setActiveTab(tab);

    if (tab !== "overview") {
      void loadAdminData();
    }
  }

  return (
    <div className="relative flex flex-1 flex-col px-4 pb-4 pt-6 sm:px-6 lg:px-10 xl:px-12">
      <header className="mb-6 lg:mb-8">
        <TenantBadge />
        <p className="mt-4 text-sm text-zinc-400">
          Gestão do estabelecimento · {tenant.slug}
        </p>
      </header>

      <AdminNav className="mb-6 lg:hidden" />

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition",
              activeTab === tab.id
                ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]"
                : "bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <section className="space-y-4 xl:space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
              {tenant.name}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-zinc-500">
              A agenda, os clientes e o caixa ficam nos itens do menu. Este
              início não mostra números estimados.
            </p>
          </div>

          {isDemoMode() ? (
          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <div className="mb-4 flex items-center gap-2">
              <Palette className="size-4 text-[var(--accent)]" />
              <h2 className="text-sm font-semibold text-zinc-100">
                White-label · tema do salão
              </h2>
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">
              Simule a identidade visual do tenant. As cores são aplicadas em
              tempo real no app cliente e no painel.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {themePresets.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => updateTheme(preset)}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-left transition hover:border-zinc-700"
                >
                  <span
                    className="mb-2 inline-block size-6 rounded-full"
                    style={{ backgroundColor: preset.primaryColor }}
                  />
                  <span className="block text-xs font-medium text-zinc-200">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </article>
          ) : null}
        </section>
      ) : null}

      {activeTab === "team" ? (
        <section className="space-y-4">
          {loadingData ? (
            <LoadingState message="Carregando equipe..." />
          ) : dataError ? (
            <ErrorState message={dataError} onRetry={() => void loadAdminData()} />
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Users className="size-4 text-[var(--accent)]" />
                  <h2 className="text-sm font-semibold text-zinc-100">
                    Profissionais vinculados
                  </h2>
                </div>
                <div className="space-y-3">
                  {(staff.length > 0 ? staff : []).map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3"
                    >
                      <AccentIconWrap className="size-10 rounded-full">
                        <UserRound className="size-4" />
                      </AccentIconWrap>
                      <div>
                        <p className="text-sm font-medium text-zinc-100">
                          {member.name}
                        </p>
                        <p className="text-xs text-zinc-500">{member.role}</p>
                      </div>
                    </div>
                  ))}
                  {staff.length === 0 ? (
                    <p className="text-sm text-zinc-500">
                      Nenhum profissional cadastrado na API.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <CalendarDays className="size-4 text-[var(--accent)]" />
                  <h2 className="text-sm font-semibold text-zinc-100">
                    Onde ver a agenda
                  </h2>
                </div>
                <p className="text-sm leading-relaxed text-zinc-400">
                  Os horários do dia estão na Agenda, com o status real de cada
                  atendimento. Esta tela não inventa slots.
                </p>
              </div>
              </div>
            </>
          )}
        </section>
      ) : null}

      {activeTab === "services" ? (
        <section className="space-y-3">
          {loadingData ? (
            <LoadingState message="Carregando serviços..." />
          ) : dataError ? (
            <ErrorState message={dataError} onRetry={() => void loadAdminData()} />
          ) : services.length === 0 ? (
            <p className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-6 text-center text-sm text-zinc-400">
              Nenhum serviço cadastrado para este estabelecimento.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => (
              <article
                key={service.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4"
              >
                <div className="flex items-start gap-3">
                  <AccentIconWrap className="size-11">
                    <Scissors className="size-5" />
                  </AccentIconWrap>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-zinc-100">
                        {service.name}
                      </h3>
                      <span className="text-sm font-semibold text-[var(--accent)]">
                        {formatCurrency(service.price)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">
                      {service.description}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">
                      {service.durationMinutes} min · ativo
                    </p>
                  </div>
                </div>
              </article>
            ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
