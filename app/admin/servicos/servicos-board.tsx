"use client";

import { AdminNav } from "@/components/admin-nav";
import { ErrorState, LoadingState } from "@/components/api-state";
import { useTenant } from "@/contexts/tenant-context";
import { formatCurrency } from "@/lib/mock-data";
import {
  api,
  getErrorMessage,
  type ApiService,
} from "@/services/api";
import { Plus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ServiceForm = {
  name: string;
  description: string;
  price: string;
  durationMin: string;
};

const EMPTY_FORM: ServiceForm = {
  name: "",
  description: "",
  price: "40",
  durationMin: "30",
};

export function ServicosBoard() {
  const { tenant } = useTenant();
  const tenantId = tenant.id === "local" ? undefined : tenant.id;
  const [services, setServices] = useState<ApiService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ApiService | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [applying, setApplying] = useState(false);

  const loadServices = useCallback(async () => {
    if (!tenantId) {
      setServices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setServices(await api.getServices(tenantId, { includeInactive: true }));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(service: ApiService) {
    setEditing(service);
    setForm({
      name: service.name,
      description: service.description ?? "",
      price: String(Number(service.price)),
      durationMin: String(service.durationMin),
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function handleApplyTemplates() {
    setApplying(true);
    setError(null);

    try {
      await api.applyServiceTemplates();
      await loadServices();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setApplying(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const price = Number(form.price.replace(",", "."));
    const durationMin = Number(form.durationMin);

    if (!form.name.trim() || !Number.isFinite(price) || !Number.isInteger(durationMin)) {
      setFormError("Informe nome, preço e duração em minutos.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (editing) {
        await api.updateService(editing.id, {
          name: form.name.trim(),
          description: form.description.trim(),
          price,
          durationMin,
          isActive: true,
        });
      } else {
        await api.createService({
          name: form.name.trim(),
          description: form.description.trim(),
          price,
          durationMin,
        });
      }

      setFormOpen(false);
      await loadServices();
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(service: ApiService) {
    setError(null);

    try {
      if (service.isActive) {
        await api.deactivateService(service.id);
      } else {
        await api.updateService(service.id, { isActive: true });
      }
      await loadServices();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  return (
    <div className="relative flex flex-1 flex-col px-4 pb-8 pt-6 sm:px-6 lg:px-10 xl:px-12">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Serviços
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">
            {tenant.name} define preço e duração. Os exemplos de barbearia
            entram como ponto de partida e podem ser alterados.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleApplyTemplates()}
            disabled={applying}
            className="rounded-full px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-900 disabled:opacity-50"
          >
            {applying ? "Incluindo..." : "Usar exemplos"}
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-zinc-950"
          >
            <Plus className="size-4" />
            Novo serviço
          </button>
        </div>
      </header>

      <AdminNav className="mb-4 lg:hidden" />

      {loading ? (
        <LoadingState message="Carregando serviços..." />
      ) : error && services.length === 0 ? (
        <ErrorState message={error} onRetry={() => void loadServices()} />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-zinc-800">
          {error ? (
            <p className="border-b border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}
          {services.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-zinc-500">
              Nenhum serviço ainda. Use os exemplos de corte e barba ou crie um
              serviço próprio.
            </p>
          ) : (
            <ul>
              {services.map((service) => (
                <li
                  key={service.id}
                  className="flex flex-col gap-3 border-b border-zinc-800 px-4 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-100">
                      {service.name}
                      {service.isActive ? null : (
                        <span className="ml-2 text-xs text-zinc-500">
                          inativo
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {formatCurrency(Number(service.price))} · {service.durationMin} min
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(service)}
                      className="rounded-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeactivate(service)}
                      className="rounded-full px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                    >
                      {service.isActive ? "Desativar" : "Reativar"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {formOpen ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 md:items-center">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-50">
                {editing ? "Editar serviço" : "Novo serviço"}
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-xl border border-zinc-800 p-2 text-zinc-400"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>
            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
              <label className="block text-sm text-zinc-400">
                Nome
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none"
                />
              </label>
              <label className="block text-sm text-zinc-400">
                Descrição
                <input
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-zinc-400">
                  Preço avulso (R$)
                  <input
                    required
                    inputMode="decimal"
                    value={form.price}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, price: event.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none"
                  />
                </label>
                <label className="block text-sm text-zinc-400">
                  Duração (min)
                  <input
                    required
                    inputMode="numeric"
                    value={form.durationMin}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        durationMin: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none"
                  />
                </label>
              </div>
              {formError ? (
                <p className="text-sm text-red-300">{formError}</p>
              ) : null}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50"
              >
                {submitting ? "Salvando..." : "Salvar serviço"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
