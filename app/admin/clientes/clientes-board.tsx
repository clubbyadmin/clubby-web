"use client";

import { AdminNav } from "@/components/admin-nav";
import { ErrorState, LoadingState } from "@/components/api-state";
import { AccentIconWrap } from "@/components/shell/accent-ui";
import { TenantBadge } from "@/components/tenant-brand";
import { useTenant } from "@/contexts/tenant-context";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/mock-data";
import {
  api,
  getErrorMessage,
  type ApiAppointmentStatus,
  type ApiClient,
  type ApiClientHistoryItem,
  type ApiReminder,
  type ApiReminderStatus,
} from "@/services/api";
import {
  Bell,
  Cake,
  CalendarClock,
  Camera,
  Clock3,
  Loader2,
  Plus,
  Search,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type BoardTab = "clients" | "reminders";
type ReminderFilter = "ALL" | ApiReminderStatus;

type ClientFormState = {
  name: string;
  phone: string;
  email: string;
  birthDate: string;
  notes: string;
};

type HistoryFormState = {
  serviceName: string;
  notes: string;
  beforePhotoUrl: string;
  afterPhotoUrl: string;
};

type ReminderFormState = {
  message: string;
  scheduledAt: string;
};

const INITIAL_CLIENT_FORM: ClientFormState = {
  name: "",
  phone: "",
  email: "",
  birthDate: "",
  notes: "",
};

const INITIAL_HISTORY_FORM: HistoryFormState = {
  serviceName: "",
  notes: "",
  beforePhotoUrl: "",
  afterPhotoUrl: "",
};

const STATUS_LABELS: Record<ApiAppointmentStatus, string> = {
  PENDING: "Pendente",
  PENDING_PAYMENT: "Aguardando pagamento",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

const REMINDER_LABELS: Record<ApiReminderStatus, string> = {
  PENDING: "Pendente",
  SENT: "Enviado",
  FAILED: "Falhou",
};

export function ClientesBoard() {
  const { tenant, loading: tenantLoading } = useTenant();
  const tenantId = tenant.id === "local" ? undefined : tenant.id;
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedTab: BoardTab =
    searchParams.get("tab") === "lembretes" ? "reminders" : "clients";

  const [tab, setTab] = useState<BoardTab>(requestedTab);
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [directory, setDirectory] = useState<ApiClient[]>([]);
  const [reminders, setReminders] = useState<ApiReminder[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [reminderFilter, setReminderFilter] = useState<ReminderFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ClientFormState>(INITIAL_CLIENT_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [selectedClient, setSelectedClient] = useState<ApiClient | null>(null);
  const [history, setHistory] = useState<ApiClientHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyForm, setHistoryForm] = useState<HistoryFormState>(
    INITIAL_HISTORY_FORM,
  );
  const [historyFormError, setHistoryFormError] = useState<string | null>(null);
  const [historySubmitting, setHistorySubmitting] = useState(false);

  const [reminderForm, setReminderForm] = useState<ReminderFormState>({
    message: "",
    scheduledAt: defaultReminderDateTime(),
  });
  const [reminderFormError, setReminderFormError] = useState<string | null>(
    null,
  );
  const [reminderSubmitting, setReminderSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setTab(requestedTab);
  }, [requestedTab]);

  function handleTabChange(next: BoardTab) {
    setTab(next);
    router.replace(
      next === "reminders" ? "/admin/clientes?tab=lembretes" : "/admin/clientes",
      { scroll: false },
    );
  }

  const loadBoard = useCallback(async () => {
    if (!tenantId) {
      setClients([]);
      setDirectory([]);
      setReminders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [allClients, reminderList] = await Promise.all([
        api.getClients({ tenantId }),
        api.getReminders({ tenantId }),
      ]);

      setDirectory(allClients);
      setReminders(reminderList);

      if (debouncedSearch) {
        setClients(
          await api.getClients({ tenantId, q: debouncedSearch }),
        );
      } else {
        setClients(allClients);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setClients([]);
      setDirectory([]);
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, debouncedSearch]);

  useEffect(() => {
    if (!tenantId) {
      setClients([]);
      setDirectory([]);
      setReminders([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);

    Promise.all([
      api.getClients({ tenantId }),
      api.getReminders({ tenantId }),
    ])
      .then(([clientsResponse, remindersResponse]) => {
        if (cancelled) {
          return;
        }

        setClients(clientsResponse);
        setDirectory(clientsResponse);
        setReminders(remindersResponse);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(getErrorMessage(requestError));
          setClients([]);
          setDirectory([]);
          setReminders([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const skipSearchEffect = useRef(true);

  useEffect(() => {
    if (!tenantId) {
      return;
    }

    if (skipSearchEffect.current) {
      skipSearchEffect.current = false;
      return;
    }

    let cancelled = false;

    api
      .getClients({
        tenantId,
        q: debouncedSearch || undefined,
      })
      .then((response) => {
        if (!cancelled) {
          setClients(response);
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(getErrorMessage(requestError));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId, debouncedSearch]);

  const birthdayThisMonth = useMemo(() => {
    const month = new Date().getMonth();
    return directory.filter((client) => {
      if (!client.birthDate) {
        return false;
      }

      return new Date(client.birthDate).getMonth() === month;
    }).length;
  }, [directory]);

  const pendingReminders = useMemo(
    () => reminders.filter((item) => item.status === "PENDING").length,
    [reminders],
  );

  const visibleReminders = useMemo(() => {
    if (reminderFilter === "ALL") {
      return reminders;
    }

    return reminders.filter((item) => item.status === reminderFilter);
  }, [reminderFilter, reminders]);

  const selectedReminders = useMemo(() => {
    if (!selectedClient) {
      return [];
    }

    return reminders.filter((item) => item.clientId === selectedClient.id);
  }, [reminders, selectedClient]);

  async function openHistory(client: ApiClient) {
    setSelectedClient(client);
    setHistory([]);
    setHistoryError(null);
    setHistoryForm(INITIAL_HISTORY_FORM);
    setHistoryFormError(null);
    setReminderForm({
      message: `Oi ${client.name.split(" ")[0]}! Passando para lembrar do seu retorno no ${tenant.name}.`,
      scheduledAt: defaultReminderDateTime(),
    });
    setReminderFormError(null);
    setHistoryLoading(true);

    try {
      const response = await api.getClientHistory(client.id);
      setHistory(response);
    } catch (requestError) {
      setHistoryError(getErrorMessage(requestError));
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleCreateClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tenantId) {
      setFormError("Tenant indisponível. Recarregue o painel e tente novamente.");
      return;
    }

    if (!form.name.trim() || !form.phone.trim()) {
      setFormError("Informe nome e telefone do cliente.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await api.createClient({
        tenantId,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        birthDate: form.birthDate
          ? new Date(`${form.birthDate}T12:00:00`).toISOString()
          : null,
        notes: form.notes.trim() || null,
      });

      setModalOpen(false);
      setForm(INITIAL_CLIENT_FORM);
      await loadBoard();
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateHistory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedClient) {
      return;
    }

    if (
      !historyForm.notes.trim() &&
      !historyForm.serviceName.trim() &&
      !historyForm.beforePhotoUrl.trim() &&
      !historyForm.afterPhotoUrl.trim()
    ) {
      setHistoryFormError(
        "Informe observações, serviço ou pelo menos uma foto.",
      );
      return;
    }

    setHistorySubmitting(true);
    setHistoryFormError(null);

    try {
      const created = await api.createClientHistory(selectedClient.id, {
        tenantId: selectedClient.tenantId,
        serviceName: historyForm.serviceName.trim() || null,
        notes: historyForm.notes.trim() || null,
        beforePhotoUrl: historyForm.beforePhotoUrl.trim() || null,
        afterPhotoUrl: historyForm.afterPhotoUrl.trim() || null,
        occurredAt: new Date().toISOString(),
      });

      setHistory((current) => [created, ...current]);
      setHistoryForm(INITIAL_HISTORY_FORM);
    } catch (requestError) {
      setHistoryFormError(getErrorMessage(requestError));
    } finally {
      setHistorySubmitting(false);
    }
  }

  async function handleCreateReminder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tenantId || !selectedClient) {
      return;
    }

    if (!reminderForm.message.trim()) {
      setReminderFormError("Escreva a mensagem do lembrete.");
      return;
    }

    setReminderSubmitting(true);
    setReminderFormError(null);

    try {
      const created = await api.createReminder({
        tenantId,
        clientId: selectedClient.id,
        message: reminderForm.message.trim(),
        scheduledAt: new Date(reminderForm.scheduledAt).toISOString(),
      });

      setReminders((current) =>
        [...current, created].sort(
          (left, right) =>
            new Date(left.scheduledAt).getTime() -
            new Date(right.scheduledAt).getTime(),
        ),
      );
      setReminderForm({
        message: reminderForm.message,
        scheduledAt: defaultReminderDateTime(),
      });
    } catch (requestError) {
      setReminderFormError(getErrorMessage(requestError));
    } finally {
      setReminderSubmitting(false);
    }
  }

  const hasLoaded = clients.length > 0 || reminders.length > 0;

  return (
    <div className="relative flex flex-1 flex-col px-4 pb-4 pt-6 sm:px-6 lg:px-10 xl:px-12">
      <header className="mb-4 flex flex-col gap-4 lg:mb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <TenantBadge />
          <p className="mt-3 text-sm text-zinc-400">
            Ficha, histórico e lembretes · {tenant.name}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setForm(INITIAL_CLIENT_FORM);
            setModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
        >
          <Plus className="size-4" />
          Novo cliente
        </button>
      </header>

      <AdminNav className="mb-4 lg:hidden" />

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {(
          [
            { id: "clients", label: "Clientes", icon: Users },
            { id: "reminders", label: "Lembretes", icon: Bell },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleTabChange(item.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition",
              tab === item.id
                ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]"
                : "bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200",
            )}
          >
            <item.icon className="size-3.5" strokeWidth={2.2} />
            {item.label}
          </button>
        ))}
      </div>

      {tenantLoading || (loading && !hasLoaded && !error) ? (
        <LoadingState message="Carregando clientes e lembretes..." />
      ) : !tenantId ? (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-6 text-center text-sm text-zinc-400">
          Não foi possível identificar o estabelecimento. Recarregue o painel
          para carregar os clientes.
        </p>
      ) : error && !hasLoaded ? (
        <ErrorState message={error} onRetry={() => void loadBoard()} />
      ) : (
        <>
          {error ? (
            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
              <button
                type="button"
                onClick={() => void loadBoard()}
                className="ml-2 underline"
              >
                Tentar novamente
              </button>
            </div>
          ) : null}

          <section className="grid gap-3 md:grid-cols-3">
            <SummaryCard
              label="Clientes"
              value={String(directory.length)}
              hint="Fichas ativas neste estabelecimento"
              icon={Users}
            />
            <SummaryCard
              label="Aniversariantes"
              value={String(birthdayThisMonth)}
              hint="Fazem aniversário neste mês"
              icon={Cake}
            />
            <SummaryCard
              label="Lembretes pendentes"
              value={String(pendingReminders)}
              hint="Aguardando envio"
              icon={Bell}
            />
          </section>

          {tab === "clients" ? (
            <ClientsSection
              clients={clients}
              search={search}
              onSearch={setSearch}
              onOpen={openHistory}
            />
          ) : (
            <RemindersSection
              reminders={visibleReminders}
              filter={reminderFilter}
              onFilter={setReminderFilter}
              onOpenClient={(clientId) => {
                const client =
                  directory.find((item) => item.id === clientId) ??
                  clients.find((item) => item.id === clientId);
                if (client) {
                  void openHistory(client);
                }
              }}
            />
          )}
        </>
      )}

      {modalOpen ? (
        <ClientModal
          form={form}
          submitting={submitting}
          error={formError}
          onClose={() => setModalOpen(false)}
          onChange={setForm}
          onSubmit={handleCreateClient}
        />
      ) : null}

      {selectedClient ? (
        <HistoryDrawer
          client={selectedClient}
          history={history}
          loading={historyLoading}
          error={historyError}
          reminders={selectedReminders}
          historyForm={historyForm}
          historyFormError={historyFormError}
          historySubmitting={historySubmitting}
          reminderForm={reminderForm}
          reminderFormError={reminderFormError}
          reminderSubmitting={reminderSubmitting}
          onHistoryChange={setHistoryForm}
          onReminderChange={setReminderForm}
          onSubmitHistory={handleCreateHistory}
          onSubmitReminder={handleCreateReminder}
          onClose={() => setSelectedClient(null)}
        />
      ) : null}
    </div>
  );
}

function ClientsSection({
  clients,
  search,
  onSearch,
  onOpen,
}: {
  clients: ApiClient[];
  search: string;
  onSearch: (value: string) => void;
  onOpen: (client: ApiClient) => void;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-[var(--accent)]" />
          <h2 className="text-sm font-semibold text-zinc-100">
            Base de clientes
          </h2>
        </div>

        <label className="relative block w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Buscar por nome, telefone ou e-mail"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-10 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
          />
        </label>
      </div>

      {clients.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 px-4 py-8 text-center text-sm text-zinc-500">
          Nenhum cliente encontrado. Cadastre a primeira ficha ou ajuste a
          busca.
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                  <th className="pb-3 pr-4 font-medium">Cliente</th>
                  <th className="pb-3 pr-4 font-medium">Telefone</th>
                  <th className="pb-3 pr-4 font-medium">E-mail</th>
                  <th className="pb-3 pr-4 font-medium">Aniversário</th>
                  <th className="pb-3 font-medium">Ficha</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="cursor-pointer border-b border-zinc-800/80 last:border-0 transition hover:bg-zinc-950/70"
                    onClick={() => onOpen(client)}
                  >
                    <td className="py-3 pr-4 font-medium text-zinc-100">
                      {client.name}
                    </td>
                    <td className="py-3 pr-4 text-zinc-300">
                      {formatPhone(client.phone)}
                    </td>
                    <td className="py-3 pr-4 text-zinc-400">
                      {client.email || "—"}
                    </td>
                    <td className="py-3 pr-4 text-zinc-300">
                      {formatBirthday(client.birthDate)}
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpen(client);
                        }}
                        className="text-xs font-semibold text-[var(--accent)] hover:underline"
                      >
                        Ver histórico
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {clients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => onOpen(client)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-100">
                      {client.name}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {formatPhone(client.phone)}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-[var(--accent)]">
                    Histórico
                  </span>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  {client.email || "Sem e-mail"} · aniversário{" "}
                  {formatBirthday(client.birthDate)}
                </p>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function RemindersSection({
  reminders,
  filter,
  onFilter,
  onOpenClient,
}: {
  reminders: ApiReminder[];
  filter: ReminderFilter;
  onFilter: (value: ReminderFilter) => void;
  onOpenClient: (clientId: string) => void;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-[var(--accent)]" />
          <h2 className="text-sm font-semibold text-zinc-100">
            Central de lembretes
          </h2>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(
            [
              { id: "ALL", label: "Todos" },
              { id: "PENDING", label: "Pendentes" },
              { id: "SENT", label: "Enviados" },
              { id: "FAILED", label: "Falhou" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onFilter(item.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                filter === item.id
                  ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]"
                  : "bg-zinc-950 text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {reminders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 px-4 py-8 text-center text-sm text-zinc-500">
          Nenhum lembrete neste filtro. Abra a ficha do cliente para agendar o
          próximo retorno.
        </p>
      ) : (
        <ul className="space-y-2">
          {reminders.map((reminder) => (
            <li key={reminder.id}>
              <button
                type="button"
                onClick={() => onOpenClient(reminder.clientId)}
                className="flex w-full flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-3 text-left transition hover:border-zinc-700 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-100">
                    {reminder.client?.name ?? "Cliente"}
                  </p>
                  <p className="mt-1 text-sm text-zinc-300">
                    {reminder.message}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
                    <CalendarClock className="size-3.5 text-[var(--accent)]" />
                    {formatDateTime(reminder.scheduledAt)}
                    {reminder.client?.phone
                      ? ` · ${formatPhone(reminder.client.phone)}`
                      : ""}
                  </p>
                </div>
                <ReminderBadge status={reminder.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ClientModal({
  form,
  submitting,
  error,
  onClose,
  onChange,
  onSubmit,
}: {
  form: ClientFormState;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onChange: React.Dispatch<React.SetStateAction<ClientFormState>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 md:items-center">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-50">
            Cadastrar cliente
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-800 p-2 text-zinc-400"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Nome">
            <input
              required
              value={form.name}
              onChange={(event) =>
                onChange((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Nome completo"
              className={inputClass}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telefone">
              <input
                required
                value={form.phone}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                placeholder="5511999990000"
                className={inputClass}
              />
            </Field>
            <Field label="Aniversário">
              <input
                type="date"
                value={form.birthDate}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    birthDate: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="E-mail">
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              placeholder="opcional"
              className={inputClass}
            />
          </Field>
          <Field label="Observações">
            <textarea
              rows={3}
              value={form.notes}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder="Preferências, alergias, horários..."
              className={cn(inputClass, "resize-none")}
            />
          </Field>
          {error ? (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50"
          >
            {submitting ? "Salvando..." : "Cadastrar cliente"}
          </button>
        </form>
      </div>
    </div>
  );
}

function HistoryDrawer({
  client,
  history,
  loading,
  error,
  reminders,
  historyForm,
  historyFormError,
  historySubmitting,
  reminderForm,
  reminderFormError,
  reminderSubmitting,
  onHistoryChange,
  onReminderChange,
  onSubmitHistory,
  onSubmitReminder,
  onClose,
}: {
  client: ApiClient;
  history: ApiClientHistoryItem[];
  loading: boolean;
  error: string | null;
  reminders: ApiReminder[];
  historyForm: HistoryFormState;
  historyFormError: string | null;
  historySubmitting: boolean;
  reminderForm: ReminderFormState;
  reminderFormError: string | null;
  reminderSubmitting: boolean;
  onHistoryChange: React.Dispatch<React.SetStateAction<HistoryFormState>>;
  onReminderChange: React.Dispatch<React.SetStateAction<ReminderFormState>>;
  onSubmitHistory: (event: React.FormEvent<HTMLFormElement>) => void;
  onSubmitReminder: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[110] flex justify-end bg-black/70">
      <button
        type="button"
        className="h-full flex-1 cursor-default"
        aria-label="Fechar histórico"
        onClick={onClose}
      />
      <aside className="flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-zinc-800 bg-zinc-950 shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <AccentIconWrap className="size-11">
                <UserRound className="size-5" />
              </AccentIconWrap>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-zinc-50">
                  {client.name}
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  {formatPhone(client.phone)}
                  {client.email ? ` · ${client.email}` : ""}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-800 p-2 text-zinc-400"
              aria-label="Fechar"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="space-y-6 px-5 py-5">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Ficha
            </p>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-zinc-500">Aniversário</dt>
                <dd className="mt-1 text-zinc-100">
                  {formatBirthday(client.birthDate, true)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Cliente desde</dt>
                <dd className="mt-1 text-zinc-100">
                  {formatShortDate(client.createdAt)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-zinc-500">Observações</dt>
                <dd className="mt-1 text-zinc-300">
                  {client.notes || "Sem anotações na ficha."}
                </dd>
              </div>
            </dl>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="size-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold text-zinc-100">
                Histórico de atendimentos
              </h3>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-6 text-sm text-zinc-400">
                <Loader2 className="size-4 animate-spin text-[var(--accent)]" />
                Carregando procedimentos...
              </div>
            ) : error ? (
              <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </p>
            ) : history.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-6 text-center text-sm text-zinc-500">
                Ainda não há procedimentos registrados nesta ficha.
              </p>
            ) : (
              <ol className="space-y-3">
                {history.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-100">
                          {item.serviceName ||
                            (item.source === "APPOINTMENT"
                              ? "Atendimento"
                              : "Anotação do profissional")}
                        </p>
                        <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
                          <Clock3 className="size-3.5 text-[var(--accent)]" />
                          {formatDateTime(item.occurredAt)}
                          {item.professional
                            ? ` · ${item.professional.name}`
                            : ""}
                        </p>
                      </div>
                      {item.status ? (
                        <AppointmentBadge status={item.status} />
                      ) : (
                        <span className="rounded-full bg-zinc-800 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
                          Nota
                        </span>
                      )}
                    </div>
                    {item.notes ? (
                      <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                        {item.notes}
                      </p>
                    ) : null}
                    {item.totalAmount ? (
                      <p className="mt-2 text-xs font-semibold text-[var(--accent)]">
                        {formatCurrency(item.totalAmount)}
                      </p>
                    ) : null}
                    {item.beforePhotoUrl || item.afterPhotoUrl ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <PhotoThumb
                          label="Antes"
                          src={item.beforePhotoUrl}
                        />
                        <PhotoThumb label="Depois" src={item.afterPhotoUrl} />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}

            <form
              onSubmit={onSubmitHistory}
              className="mt-4 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Registrar observação
              </p>
              <Field label="Serviço">
                <input
                  value={historyForm.serviceName}
                  onChange={(event) =>
                    onHistoryChange((current) => ({
                      ...current,
                      serviceName: event.target.value,
                    }))
                  }
                  placeholder="Ex: Corte + barba"
                  className={inputClass}
                />
              </Field>
              <Field label="Observações do profissional">
                <textarea
                  rows={3}
                  value={historyForm.notes}
                  onChange={(event) =>
                    onHistoryChange((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Resultado, preferências, próximo passo..."
                  className={cn(inputClass, "resize-none")}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Foto antes">
                  <input
                    value={historyForm.beforePhotoUrl}
                    onChange={(event) =>
                      onHistoryChange((current) => ({
                        ...current,
                        beforePhotoUrl: event.target.value,
                      }))
                    }
                    placeholder="URL da foto"
                    className={inputClass}
                  />
                </Field>
                <Field label="Foto depois">
                  <input
                    value={historyForm.afterPhotoUrl}
                    onChange={(event) =>
                      onHistoryChange((current) => ({
                        ...current,
                        afterPhotoUrl: event.target.value,
                      }))
                    }
                    placeholder="URL da foto"
                    className={inputClass}
                  />
                </Field>
              </div>
              {historyFormError ? (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {historyFormError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={historySubmitting}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-zinc-100 disabled:opacity-50"
              >
                {historySubmitting ? "Salvando..." : "Adicionar ao histórico"}
              </button>
            </form>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <Bell className="size-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold text-zinc-100">
                Lembretes deste cliente
              </h3>
            </div>

            {reminders.length === 0 ? (
              <p className="mb-3 text-xs text-zinc-500">
                Nenhum lembrete agendado ainda.
              </p>
            ) : (
              <ul className="mb-3 space-y-2">
                {reminders.map((reminder) => (
                  <li
                    key={reminder.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-200">{reminder.message}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">
                        {formatDateTime(reminder.scheduledAt)}
                      </p>
                    </div>
                    <ReminderBadge status={reminder.status} />
                  </li>
                ))}
              </ul>
            )}

            <form
              onSubmit={onSubmitReminder}
              className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Agendar lembrete
              </p>
              <Field label="Mensagem">
                <textarea
                  required
                  rows={3}
                  value={reminderForm.message}
                  onChange={(event) =>
                    onReminderChange((current) => ({
                      ...current,
                      message: event.target.value,
                    }))
                  }
                  className={cn(inputClass, "resize-none")}
                />
              </Field>
              <Field label="Enviar em">
                <input
                  required
                  type="datetime-local"
                  value={reminderForm.scheduledAt}
                  onChange={(event) =>
                    onReminderChange((current) => ({
                      ...current,
                      scheduledAt: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </Field>
              {reminderFormError ? (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {reminderFormError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={reminderSubmitting}
                className="w-full rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-50"
              >
                {reminderSubmitting ? "Agendando..." : "Agendar lembrete"}
              </button>
            </form>
          </section>
        </div>
      </aside>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Users;
}) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-zinc-50">{value}</p>
          <p className="mt-1 text-xs text-[var(--accent)]">{hint}</p>
        </div>
        <AccentIconWrap className="size-11">
          <Icon className="size-5" strokeWidth={2.2} />
        </AccentIconWrap>
      </div>
    </article>
  );
}

function PhotoThumb({ label, src }: { label: string; src: string | null }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      {src ? (
        <img src={src} alt={label} className="h-28 w-full object-cover" />
      ) : (
        <div className="flex h-28 items-center justify-center text-zinc-600">
          <Camera className="size-5" />
        </div>
      )}
      <p className="px-2 py-1.5 text-center text-[10px] uppercase tracking-wide text-zinc-500">
        {label}
      </p>
    </div>
  );
}

function AppointmentBadge({ status }: { status: ApiAppointmentStatus }) {
  const tone =
    status === "COMPLETED"
      ? "bg-emerald-500/10 text-emerald-300"
      : status === "CANCELLED" || status === "NO_SHOW"
        ? "bg-rose-500/10 text-rose-300"
        : status === "PENDING" || status === "PENDING_PAYMENT"
          ? "bg-amber-500/10 text-amber-300"
          : "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]";

  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
        tone,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function ReminderBadge({ status }: { status: ApiReminderStatus }) {
  const tone =
    status === "SENT"
      ? "bg-emerald-500/10 text-emerald-300"
      : status === "FAILED"
        ? "bg-rose-500/10 text-rose-300"
        : "bg-amber-500/10 text-amber-300";

  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
        tone,
      )}
    >
      {REMINDER_LABELS[status]}
    </span>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]";

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("55") && digits.length === 13) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  return phone;
}

function formatBirthday(value: string | null, withYear = false) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    ...(withYear ? { year: "numeric" as const } : {}),
  });
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function defaultReminderDateTime() {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  date.setMinutes(0, 0, 0);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:00`;
}
