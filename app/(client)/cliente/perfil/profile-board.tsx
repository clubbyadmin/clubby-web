"use client";

import { ClientAreaNav } from "@/components/client-area-nav";
import { ErrorState, LoadingState } from "@/components/api-state";
import { AccentIconWrap } from "@/components/shell/accent-ui";
import { PageHeader } from "@/components/page-header";
import { useTenant } from "@/contexts/tenant-context";
import { cn } from "@/lib/cn";
import {
  digitsOnly,
  formatCep,
  formatCpf,
  lookupCep,
  readIntegrations,
  toDateInputValue,
  writeIntegrations,
} from "@/lib/customer-profile";
import {
  api,
  getErrorMessage,
  type ApiCustomerProfile,
} from "@/services/api";
import {
  CalendarCheck,
  Camera,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ProfileForm = {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  cpf: string;
  zipCode: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  avatarUrl: string;
  password: string;
  confirmPassword: string;
};

const INITIAL_FORM: ProfileForm = {
  name: "",
  email: "",
  phone: "",
  birthDate: "",
  cpf: "",
  zipCode: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  avatarUrl: "",
  password: "",
  confirmPassword: "",
};

function profileToForm(profile: ApiCustomerProfile): ProfileForm {
  const { user, client } = profile;
  return {
    name: user.name,
    email: user.email ?? "",
    phone: user.phone,
    birthDate: toDateInputValue(user.birthDate ?? client.birthDate),
    cpf: formatCpf(client.cpf ?? ""),
    zipCode: formatCep(client.zipCode ?? ""),
    street: client.street ?? "",
    number: client.number ?? "",
    neighborhood: client.neighborhood ?? "",
    city: client.city ?? "",
    state: client.state ?? "",
    avatarUrl: client.avatarUrl ?? "",
    password: "",
    confirmPassword: "",
  };
}

export function ProfileBoard() {
  const { tenant } = useTenant();
  const tenantId = tenant.id === "local" ? undefined : tenant.id;
  const [profile, setProfile] = useState<ApiCustomerProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lookingCep, setLookingCep] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [googleCalendar, setGoogleCalendar] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!tenantId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.getCustomerProfile({ tenantId });
      setProfile(response);
      setForm(profileToForm(response));
      setGoogleCalendar(readIntegrations(tenantId).googleCalendar);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  function updateField<Key extends keyof ProfileForm>(
    key: Key,
    value: ProfileForm[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleAvatar(file: File | null) {
    if (!file) {
      return;
    }

    const dataUrl = await resizeImage(file);
    updateField("avatarUrl", dataUrl);
  }

  async function handleCepBlur() {
    const digits = digitsOnly(form.zipCode);
    if (digits.length !== 8) {
      return;
    }

    setLookingCep(true);
    try {
      const address = await lookupCep(digits);
      if (address) {
        setForm((current) => ({
          ...current,
          street: address.street || current.street,
          neighborhood: address.neighborhood || current.neighborhood,
          city: address.city || current.city,
          state: address.state || current.state,
        }));
      }
    } finally {
      setLookingCep(false);
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tenantId || !profile) {
      setFormError("Não foi possível identificar o estabelecimento.");
      return;
    }

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setFormError("Preencha nome completo, e-mail e telefone.");
      return;
    }

    if (form.password && form.password.length < 6) {
      setFormError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (form.password && form.password !== form.confirmPassword) {
      setFormError("A confirmação da senha não confere.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const response = await api.updateCustomerProfile({
        tenantId,
        userId: profile.user.id,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: digitsOnly(form.phone),
        birthDate: form.birthDate || null,
        cpf: form.cpf,
        zipCode: form.zipCode,
        street: form.street,
        number: form.number,
        neighborhood: form.neighborhood,
        city: form.city,
        state: form.state,
        avatarUrl: form.avatarUrl || null,
        ...(form.password ? { password: form.password } : {}),
      });
      setProfile(response);
      setForm(profileToForm(response));
      writeIntegrations(tenantId, { googleCalendar });
      setSavedAt(
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="relative flex flex-1 flex-col px-5 pb-8 pt-8">
        <PageHeader
          title="Meu perfil"
          subtitle="Dados pessoais e segurança"
          backHref="/cliente"
        />
        <LoadingState message="Carregando seu cadastro..." />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="relative flex flex-1 flex-col px-5 pb-8 pt-8">
        <PageHeader
          title="Meu perfil"
          subtitle="Dados pessoais e segurança"
          backHref="/cliente"
        />
        <ErrorState
          message={error ?? "Nenhum cliente encontrado."}
          onRetry={() => void loadProfile()}
        />
      </div>
    );
  }

  const initials = form.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="relative flex flex-1 flex-col px-5 pb-8 pt-8">
      <PageHeader
        title="Meu perfil"
        subtitle="Foto, dados e endereço para campanhas e acesso"
        backHref="/cliente"
      />
      <ClientAreaNav />

      <form onSubmit={handleSave} className="space-y-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
          <div className="flex items-center gap-4">
            <label className="relative shrink-0 cursor-pointer">
              {form.avatarUrl ? (
                <img
                  src={form.avatarUrl}
                  alt={form.name}
                  className="size-20 rounded-2xl object-cover ring-2 ring-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
                />
              ) : (
                <span className="inline-flex size-20 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-lg font-bold text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]">
                  {initials || <UserRound className="size-7" />}
                </span>
              )}
              <span className="absolute -bottom-1 -right-1 inline-flex size-8 items-center justify-center rounded-xl bg-[var(--accent)] text-zinc-950 shadow-lg">
                <Camera className="size-4" strokeWidth={2.4} />
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) =>
                  void handleAvatar(event.target.files?.[0] ?? null)
                }
              />
            </label>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-zinc-50">{form.name}</p>
              <p className="mt-1 text-xs text-zinc-500">
                O e-mail é a chave de acesso e identifica o estabelecimento.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
          <SectionTitle icon={UserRound} title="Dados pessoais" />
          <Field label="Nome completo">
            <input
              required
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className={fieldClass}
              autoComplete="name"
            />
          </Field>
          <Field label="E-mail de acesso">
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              className={fieldClass}
              autoComplete="email"
            />
          </Field>
          <Field label="Telefone / WhatsApp">
            <input
              required
              inputMode="tel"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              className={fieldClass}
              autoComplete="tel"
            />
          </Field>
          <Field label="Data de nascimento">
            <input
              required
              type="date"
              value={form.birthDate}
              onChange={(event) => updateField("birthDate", event.target.value)}
              className={fieldClass}
            />
          </Field>
          <p className="-mt-1 text-[11px] text-zinc-500">
            Usamos a data para campanhas de aniversário do clube.
          </p>
          <Field label="CPF">
            <input
              inputMode="numeric"
              value={form.cpf}
              onChange={(event) =>
                updateField("cpf", formatCpf(event.target.value))
              }
              placeholder="000.000.000-00"
              className={fieldClass}
            />
          </Field>
        </section>

        <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
          <SectionTitle icon={MapPin} title="Endereço" />
          <Field label="CEP">
            <div className="relative">
              <input
                inputMode="numeric"
                value={form.zipCode}
                onChange={(event) =>
                  updateField("zipCode", formatCep(event.target.value))
                }
                onBlur={() => void handleCepBlur()}
                placeholder="00000-000"
                className={fieldClass}
              />
              {lookingCep ? (
                <Loader2 className="absolute right-3 top-3 size-4 animate-spin text-zinc-500" />
              ) : null}
            </div>
          </Field>
          <Field label="Rua">
            <input
              value={form.street}
              onChange={(event) => updateField("street", event.target.value)}
              className={fieldClass}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Número" className="col-span-1">
              <input
                value={form.number}
                onChange={(event) => updateField("number", event.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="Bairro" className="col-span-2">
              <input
                value={form.neighborhood}
                onChange={(event) =>
                  updateField("neighborhood", event.target.value)
                }
                className={fieldClass}
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Cidade" className="col-span-2">
              <input
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="UF">
              <input
                maxLength={2}
                value={form.state}
                onChange={(event) =>
                  updateField("state", event.target.value.toUpperCase())
                }
                className={fieldClass}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
          <SectionTitle icon={ShieldCheck} title="Segurança da conta" />
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-3">
            <p className="inline-flex items-center gap-2 text-sm text-zinc-200">
              <Mail className="size-4 text-[var(--accent)]" />
              Acesso por e-mail
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {form.email || "Cadastre um e-mail para entrar no clube."}
            </p>
          </div>
          <Field label="Nova senha">
            <input
              type="password"
              minLength={6}
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="Deixe em branco para manter"
              className={fieldClass}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirmar senha">
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(event) =>
                updateField("confirmPassword", event.target.value)
              }
              className={fieldClass}
              autoComplete="new-password"
            />
          </Field>
          <p className="inline-flex items-center gap-2 text-[11px] text-zinc-500">
            <KeyRound className="size-3.5" />
            A senha protege o painel do cliente neste estabelecimento.
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
          <SectionTitle icon={CalendarCheck} title="Integrações" />
          <button
            type="button"
            onClick={() => {
              const next = !googleCalendar;
              setGoogleCalendar(next);
              if (tenantId) {
                writeIntegrations(tenantId, { googleCalendar: next });
              }
            }}
            className={cn(
              "flex min-h-14 w-full items-center justify-between rounded-2xl border px-4 py-3 text-left",
              googleCalendar
                ? "border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
                : "border-zinc-800 bg-zinc-950/70",
            )}
          >
            <span>
              <span className="block text-sm font-semibold text-zinc-100">
                Google Agenda
              </span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                {googleCalendar
                  ? "Sincronização ativa. Use o botão nos agendamentos."
                  : "Sincronize horários com um toque."}
              </span>
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                googleCalendar
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-zinc-800 text-zinc-400",
              )}
            >
              {googleCalendar ? "Conectado" : "Sincronizar"}
            </span>
          </button>
        </section>

        {formError ? (
          <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {formError}
          </p>
        ) : null}

        {savedAt ? (
          <p className="text-center text-xs text-emerald-400">
            Alterações salvas às {savedAt}.
          </p>
        ) : null}

        <div className="sticky bottom-24 z-40 -mx-5 border-t border-zinc-800 bg-zinc-950/95 px-5 py-3 backdrop-blur-md">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-5 py-3.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-[color-mix(in_srgb,var(--accent)_20%,transparent)] disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}

const fieldClass =
  "w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600";

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: typeof UserRound;
  title: string;
}) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <AccentIconWrap className="size-8">
        <Icon className="size-4" strokeWidth={2.2} />
      </AccentIconWrap>
      <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}

async function resizeImage(file: File): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = 320;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) {
      return readFileAsDataUrl(file);
    }

    const minSide = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - minSide) / 2;
    const sy = (bitmap.height - minSide) / 2;
    context.drawImage(bitmap, sx, sy, minSide, minSide, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return readFileAsDataUrl(file);
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
