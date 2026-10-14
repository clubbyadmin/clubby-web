"use client";

import { AdminNav } from "@/components/admin-nav";
import { ErrorState, LoadingState } from "@/components/api-state";
import { AccentIconWrap } from "@/components/shell/accent-ui";
import { TenantBadge } from "@/components/tenant-brand";
import { useTenant } from "@/contexts/tenant-context";
import { cn } from "@/lib/cn";
import {
  api,
  getErrorMessage,
  type ApiAccessStatus,
  type ApiStaffRole,
  type ApiUser,
} from "@/services/api";
import {
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  UserCog,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type RoleFilter = "ALL" | ApiStaffRole;

type UserFormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: ApiStaffRole;
  commissionPercent: string;
  asaasWalletId: string;
};

const INITIAL_FORM: UserFormState = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "PROFESSIONAL",
  commissionPercent: "50",
  asaasWalletId: "",
};

const STAFF_ROLES: Array<{
  id: ApiStaffRole;
  label: string;
  hint: string;
}> = [
  {
    id: "ADMIN",
    label: "Administrador",
    hint: "Painel completo, financeiro e permissões",
  },
  {
    id: "RECEPTIONIST",
    label: "Recepcionista",
    hint: "Agenda Kanban, clientes e lembretes",
  },
  {
    id: "PROFESSIONAL",
    label: "Barbeiro",
    hint: "Meu Painel e extrato de comissões pessoais",
  },
];

const ROLE_BADGE: Record<
  ApiStaffRole,
  { label: string; className: string }
> = {
  ADMIN: {
    label: "Admin",
    className:
      "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]",
  },
  RECEPTIONIST: {
    label: "Recepcionista",
    className: "bg-sky-500/10 text-sky-300 ring-sky-500/20",
  },
  PROFESSIONAL: {
    label: "Barbeiro",
    className: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20",
  },
};

export function UsuariosBoard() {
  const { tenant, loading: tenantLoading } = useTenant();
  const tenantId = tenant.id === "local" ? undefined : tenant.id;

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [filter, setFilter] = useState<RoleFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [form, setForm] = useState<UserFormState>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    if (!tenantId) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.getUsers({ tenantId, staffOnly: true });
      setUsers(response);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((user) => user.role === "ADMIN").length,
      reception: users.filter((user) => user.role === "RECEPTIONIST").length,
      professionals: users.filter((user) => user.role === "PROFESSIONAL")
        .length,
      pending: users.filter((user) => user.accessStatus === "PENDING").length,
    };
  }, [users]);

  const visibleUsers = useMemo(() => {
    if (filter === "ALL") {
      return users;
    }

    return users.filter((user) => user.role === filter);
  }, [filter, users]);

  function openCreateModal() {
    setFormError(null);
    setEditingUser(null);
    setForm(INITIAL_FORM);
    setModalOpen(true);
  }

  function openEditModal(user: ApiUser) {
    setFormError(null);
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email ?? "",
      phone: user.phone,
      password: "",
      role: toStaffRole(user.role),
      commissionPercent: String(
        Math.round(Number(user.commissionRate ?? 0) * 100),
      ),
      asaasWalletId: user.asaasWalletId ?? "",
    });
    setModalOpen(true);
  }

  async function handleSaveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tenantId) {
      setFormError("Tenant indisponível. Recarregue o painel e tente novamente.");
      return;
    }

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.replace(/\D/g, "");
    const password = form.password.trim();
    const commissionRate = Number(form.commissionPercent.replace(",", ".")) / 100;
    const asaasWalletId = form.asaasWalletId.trim();

    if (!name || !email || !phone) {
      setFormError("Preencha nome, e-mail de acesso, telefone e cargo.");
      return;
    }

    if (!editingUser && password.length < 6) {
      setFormError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (editingUser && password && password.length < 6) {
      setFormError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 1) {
      setFormError("A comissão precisa ficar entre 0% e 100%.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, {
          name,
          email,
          phone,
          role: form.role,
          commissionRate,
          asaasWalletId: asaasWalletId || null,
          ...(password ? { password } : {}),
        });
      } else {
        await api.createUser({
          tenantId,
          name,
          email,
          phone,
          password,
          role: form.role,
          commissionRate,
          asaasWalletId: asaasWalletId || null,
        });
      }
      setModalOpen(false);
      setEditingUser(null);
      setForm(INITIAL_FORM);
      await loadUsers();
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleChange(userId: string, role: ApiStaffRole) {
    setUpdatingId(userId);
    setError(null);

    try {
      const updated = await api.updateUserRole(userId, role);
      setUsers((current) =>
        current.map((user) => (user.id === userId ? updated : user)),
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="relative flex flex-1 flex-col px-4 pb-4 pt-6 sm:px-6 lg:px-10 xl:px-12">
      <header className="mb-4 flex flex-col gap-4 lg:mb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <TenantBadge />
          <p className="mt-3 text-sm text-zinc-400">
            Usuários e permissões · {tenant.name}
          </p>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">
            O e-mail libera o acesso. A carteira Asaas do profissional é a
            conta que recebe a parte dele no split.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
        >
          <Plus className="size-4" />
          Cadastrar colaborador
        </button>
      </header>

      <AdminNav className="mb-4 lg:hidden" />

      {tenantLoading || (loading && users.length === 0 && !error) ? (
        <LoadingState message="Carregando equipe..." />
      ) : !tenantId ? (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-6 text-center text-sm text-zinc-400">
          Não foi possível identificar o estabelecimento. Recarregue o painel
          para gerenciar os usuários.
        </p>
      ) : error && users.length === 0 ? (
        <ErrorState message={error} onRetry={() => void loadUsers()} />
      ) : (
        <>
          {error ? (
            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
              <button
                type="button"
                onClick={() => void loadUsers()}
                className="ml-2 underline"
              >
                Tentar novamente
              </button>
            </div>
          ) : null}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Colaboradores"
              value={String(stats.total)}
              hint="Com acesso ao painel interno"
              icon={Users}
            />
            <SummaryCard
              label="Administradores"
              value={String(stats.admins)}
              hint="Cadastro e permissões"
              icon={ShieldCheck}
            />
            <SummaryCard
              label="Barbeiros"
              value={String(stats.professionals)}
              hint={`${stats.reception} na recepção`}
              icon={UserRound}
            />
            <SummaryCard
              label="Sem acesso"
              value={String(stats.pending)}
              hint="Falta e-mail ou senha"
              icon={KeyRound}
            />
          </section>

          <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <UserCog className="size-4 text-[var(--accent)]" />
                <h2 className="text-sm font-semibold text-zinc-100">
                  Equipe do estabelecimento
                </h2>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {(
                  [
                    { id: "ALL", label: "Todos" },
                    { id: "ADMIN", label: "Admin" },
                    { id: "RECEPTIONIST", label: "Recepção" },
                    { id: "PROFESSIONAL", label: "Barbeiros" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
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

            {visibleUsers.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 px-4 py-8 text-center text-sm text-zinc-500">
                Nenhum colaborador neste filtro. Cadastre um funcionário para
                liberar o acesso ao painel.
              </p>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-[11px] uppercase tracking-wide text-zinc-500">
                        <th className="px-3 py-2 font-medium">Colaborador</th>
                        <th className="px-3 py-2 font-medium">E-mail de acesso</th>
                        <th className="px-3 py-2 font-medium">Cargo</th>
                        <th className="px-3 py-2 font-medium">Acesso</th>
                        <th className="px-3 py-2 font-medium">Repasse</th>
                        <th className="px-3 py-2 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b border-zinc-800/80 last:border-0"
                        >
                          <td className="px-3 py-3">
                            <p className="font-medium text-zinc-100">
                              {user.name}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {formatPhone(user.phone)}
                            </p>
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-medium text-zinc-100">
                              {user.email || "—"}
                            </p>
                            <p className="text-[11px] text-zinc-500">
                              Chave única · identifica o estabelecimento
                            </p>
                          </td>
                          <td className="px-3 py-3">
                            <RoleBadge role={user.role} />
                          </td>
                          <td className="px-3 py-3">
                            <AccessBadge
                              status={user.accessStatus}
                              email={user.email}
                            />
                          </td>
                          <td className="px-3 py-3 text-xs text-zinc-400">
                            {user.role === "PROFESSIONAL"
                              ? user.asaasWalletId || "Sem carteira"
                              : "—"}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(user)}
                                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-zinc-700"
                              >
                                <Pencil className="size-3.5 text-[var(--accent)]" />
                                Editar
                              </button>
                              <RoleSelect
                                value={toStaffRole(user.role)}
                                disabled={updatingId === user.id}
                                onChange={(role) =>
                                  void handleRoleChange(user.id, role)
                                }
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className="space-y-3 md:hidden">
                  {visibleUsers.map((user) => (
                    <li
                      key={user.id}
                      className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-zinc-100">
                            {user.name}
                          </p>
                          <p className="mt-1 truncate text-sm text-zinc-100">
                            {user.email || "Sem e-mail de acesso"}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {formatPhone(user.phone)}
                          </p>
                        </div>
                        <AccessBadge
                          status={user.accessStatus}
                          email={user.email}
                        />
                      </div>
                      <div className="mt-3 flex flex-col gap-2">
                        <RoleBadge role={user.role} />
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200"
                        >
                          <Pencil className="size-3.5 text-[var(--accent)]" />
                          Editar cadastro
                        </button>
                        <RoleSelect
                          value={toStaffRole(user.role)}
                          disabled={updatingId === user.id}
                          onChange={(role) =>
                            void handleRoleChange(user.id, role)
                          }
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}

      {modalOpen ? (
        <UserModal
          mode={editingUser ? "edit" : "create"}
          accountId={editingUser?.id ?? null}
          form={form}
          submitting={submitting}
          error={formError}
          onClose={() => {
            setModalOpen(false);
            setEditingUser(null);
          }}
          onChange={setForm}
          onSubmit={handleSaveUser}
        />
      ) : null}
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
      <div className="mb-3 flex items-center gap-2">
        <AccentIconWrap className="size-9">
          <Icon className="size-4" strokeWidth={2.2} />
        </AccentIconWrap>
        <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      </div>
      <p className="text-xl font-semibold text-zinc-100">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
    </article>
  );
}

function RoleBadge({ role }: { role: ApiUser["role"] }) {
  const staffRole = toStaffRole(role);
  const badge = ROLE_BADGE[staffRole];

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
        badge.className,
      )}
    >
      {badge.label}
    </span>
  );
}

function AccessBadge({
  status,
  email,
}: {
  status?: ApiAccessStatus;
  email: string | null;
}) {
  if (!email) {
    return (
      <span className="inline-flex rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-300 ring-1 ring-rose-500/20">
        Sem e-mail
      </span>
    );
  }

  const active = status !== "PENDING";

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
        active
          ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
          : "bg-zinc-800 text-zinc-400 ring-zinc-700",
      )}
    >
      {active ? "Acesso ativo" : "Sem senha"}
    </span>
  );
}

function RoleSelect({
  value,
  disabled,
  onChange,
}: {
  value: ApiStaffRole;
  disabled: boolean;
  onChange: (role: ApiStaffRole) => void;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as ApiStaffRole)}
      className="min-h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none disabled:opacity-60"
      aria-label="Alterar cargo"
    >
      {STAFF_ROLES.map((item) => (
        <option key={item.id} value={item.id}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

function UserModal({
  mode,
  accountId,
  form,
  submitting,
  error,
  onClose,
  onChange,
  onSubmit,
}: {
  mode: "create" | "edit";
  accountId: string | null;
  form: UserFormState;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onChange: React.Dispatch<React.SetStateAction<UserFormState>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const isEdit = mode === "edit";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 md:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-50">
              {isEdit ? "Editar colaborador" : "Cadastrar novo usuário"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              O e-mail entra no login. A senha fica só como hash e não volta
              para esta tela.
            </p>
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

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Nome">
            <input
              required
              value={form.name}
              onChange={(event) =>
                onChange((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Ex: Ana Souza"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
            />
          </Field>

          <Field label="E-mail de acesso">
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              placeholder="ana@studiobarbearia.com"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
            />
          </Field>

          <Field label="Telefone / WhatsApp">
            <input
              required
              inputMode="tel"
              value={form.phone}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  phone: event.target.value,
                }))
              }
              placeholder="5511999990000"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
            />
          </Field>

          <Field label={isEdit ? "Nova senha (opcional)" : "Senha inicial"}>
            <input
              required={!isEdit}
              type="password"
              minLength={isEdit ? undefined : 6}
              value={form.password}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              placeholder={
                isEdit
                  ? "Deixe em branco para manter a senha atual"
                  : "Mínimo de 6 caracteres"
              }
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
            />
          </Field>

          {accountId ? (
            <Field label="Identificador da conta">
              <input
                readOnly
                value={accountId}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 font-mono text-xs text-zinc-400 outline-none"
              />
            </Field>
          ) : null}

          {form.role === "PROFESSIONAL" ? (
            <>
              <Field label="Comissão do profissional (%)">
                <input
                  required
                  inputMode="decimal"
                  value={form.commissionPercent}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      commissionPercent: event.target.value,
                    }))
                  }
                  placeholder="50"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                />
              </Field>
              <Field label="Carteira Asaas do repasse">
                <input
                  value={form.asaasWalletId}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      asaasWalletId: event.target.value,
                    }))
                  }
                  placeholder="Identificador da carteira, sem espaços"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                />
              </Field>
            </>
          ) : null}

          <fieldset>
            <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Cargo / perfil
            </legend>
            <div className="grid gap-2">
              {STAFF_ROLES.map((item) => {
                const selected = form.role === item.id;

                return (
                  <label
                    key={item.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 transition",
                      selected
                        ? "border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
                        : "border-zinc-800 bg-zinc-900/60",
                    )}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={item.id}
                      checked={selected}
                      onChange={() =>
                        onChange((current) => ({ ...current, role: item.id }))
                      }
                      className="mt-1 accent-[var(--accent)]"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-zinc-100">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        {item.hint}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {error ? (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isEdit ? (
              <Pencil className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {submitting
              ? "Salvando..."
              : isEdit
                ? "Salvar alterações"
                : "Cadastrar funcionário"}
          </button>
        </form>
      </div>
    </div>
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

function toStaffRole(role: ApiUser["role"]): ApiStaffRole {
  if (role === "ADMIN" || role === "RECEPTIONIST" || role === "PROFESSIONAL") {
    return role;
  }

  return "PROFESSIONAL";
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }

  return phone;
}
