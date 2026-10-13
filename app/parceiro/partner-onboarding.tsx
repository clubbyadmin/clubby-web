"use client";

import {
  BUSINESS_TYPES,
  slugFromName,
  type BusinessType,
} from "@/lib/business-type";
import { cn } from "@/lib/cn";
import { api, getErrorMessage } from "@/services/api";
import { Building2, CheckCircle2, MapPin, UserRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type FormState = {
  businessType: BusinessType | "";
  name: string;
  slug: string;
  document: string;
  whatsappNumber: string;
  city: string;
  state: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerPassword: string;
};

const INITIAL: FormState = {
  businessType: "",
  name: "",
  slug: "",
  document: "",
  whatsappNumber: "",
  city: "",
  state: "",
  ownerName: "",
  ownerEmail: "",
  ownerPhone: "",
  ownerPassword: "",
};

export function PartnerOnboarding() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  const selectedType = useMemo(
    () => BUSINESS_TYPES.find((item) => item.id === form.businessType),
    [form.businessType],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };

      if (key === "name" && !slugTouched) {
        next.slug = slugFromName(String(value));
      }

      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.businessType) {
      setError("Escolha o tipo de negócio para personalizar a experiência.");
      return;
    }

    setSubmitting(true);

    try {
      const created = await api.registerTenant({
        name: form.name,
        slug: form.slug,
        document: form.document,
        whatsappNumber: form.whatsappNumber,
        businessType: form.businessType,
        ownerName: form.ownerName,
        ownerEmail: form.ownerEmail,
        ownerPhone: form.ownerPhone,
        ownerPassword: form.ownerPassword,
        city: form.city || undefined,
        state: form.state || undefined,
      });

      setCreatedSlug(created.slug);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  if (createdSlug) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center px-5 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
          <CheckCircle2 className="size-8" strokeWidth={1.8} />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-zinc-50">
          Cadastro enviado
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
          Seu estabelecimento{" "}
          <span className="font-medium text-zinc-200">/{createdSlug}</span>{" "}
          está em análise. A equipe Clubby libera o painel assim que o
          parceiro for aprovado.
        </p>
        <Link
          href="/"
          className="mt-8 rounded-full bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-950"
        >
          Voltar ao início
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 pb-16">
      <header className="max-w-xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-400/80">
          Onboarding Clubby
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">
          Cadastre seu estabelecimento
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Escolha o tipo de negócio para personalizar agenda, serviços e a
          experiência dos seus clientes.
        </p>
      </header>

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-10 space-y-10">
        <section>
          <SectionTitle icon={Building2} title="Tipo de negócio" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {BUSINESS_TYPES.map((item) => {
              const Icon = item.icon;
              const selected = form.businessType === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => update("businessType", item.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border px-4 py-4 text-left transition",
                    selected
                      ? "border-amber-400/50 bg-amber-400/10 ring-1 ring-amber-400/30"
                      : "border-zinc-800 bg-zinc-900/70 hover:border-zinc-700",
                  )}
                >
                  <span
                    suppressHydrationWarning
                    className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: `${item.accent}26`,
                      color: item.accent,
                    }}
                  >
                    <Icon className="size-4" strokeWidth={2} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-zinc-100">
                      {item.label}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {selectedType ? (
            <p className="mt-3 text-xs text-zinc-500">
              Experiência inicial: {selectedType.label}.
            </p>
          ) : null}
        </section>

        <section>
          <SectionTitle icon={MapPin} title="Estabelecimento" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field
              label="Nome comercial"
              value={form.name}
              onChange={(value) => update("name", value)}
              placeholder="Studio Barbearia"
              className="sm:col-span-2"
            />
            <Field
              label="Endereço na web (slug)"
              value={form.slug}
              onChange={(value) => {
                setSlugTouched(true);
                update("slug", value);
              }}
              placeholder="studio-barbearia"
              hint={form.slug ? `clubby.app/${form.slug}` : undefined}
            />
            <Field
              label="CNPJ ou CPF"
              value={form.document}
              onChange={(value) => update("document", value)}
              placeholder="00.000.000/0001-00"
            />
            <Field
              label="WhatsApp do salão"
              value={form.whatsappNumber}
              onChange={(value) => update("whatsappNumber", value)}
              placeholder="11999999999"
            />
            <Field
              label="Cidade"
              value={form.city}
              onChange={(value) => update("city", value)}
              placeholder="São Paulo"
            />
            <Field
              label="UF"
              value={form.state}
              onChange={(value) => update("state", value.toUpperCase().slice(0, 2))}
              placeholder="SP"
            />
          </div>
        </section>

        <section>
          <SectionTitle icon={UserRound} title="Responsável" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field
              label="Seu nome"
              value={form.ownerName}
              onChange={(value) => update("ownerName", value)}
              className="sm:col-span-2"
            />
            <Field
              label="E-mail de acesso"
              type="email"
              value={form.ownerEmail}
              onChange={(value) => update("ownerEmail", value)}
            />
            <Field
              label="Telefone"
              value={form.ownerPhone}
              onChange={(value) => update("ownerPhone", value)}
            />
            <Field
              label="Senha"
              type="password"
              value={form.ownerPassword}
              onChange={(value) => update("ownerPassword", value)}
              hint="Mínimo de 8 caracteres"
              className="sm:col-span-2"
            />
          </div>
        </section>

        {error ? (
          <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 px-5 py-4 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/10 transition disabled:opacity-60"
        >
          {submitting ? "Enviando cadastro..." : "Enviar para aprovação"}
        </button>
      </form>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: typeof Building2;
  title: string;
}) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
      <Icon className="size-4 text-amber-400" strokeWidth={2} />
      {title}
    </h2>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = "text",
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-medium text-zinc-400">
        {label}
      </span>
      <input
        type={type}
        required={label !== "Cidade" && label !== "UF"}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none ring-amber-400/0 transition placeholder:text-zinc-600 focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/20"
      />
      {hint ? <span className="mt-1 block text-[11px] text-zinc-500">{hint}</span> : null}
    </label>
  );
}
