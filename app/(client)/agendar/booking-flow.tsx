"use client";

import { ErrorState, LoadingState } from "@/components/api-state";
import { PageHeader } from "@/components/page-header";
import { useTenant } from "@/contexts/tenant-context";
import { tenantHref } from "@/lib/tenant-paths";
import {
  formatCurrency,
  formatShortDate,
  getAvailableDates,
  professionals as fallbackProfessionals,
  services as fallbackServices,
  timeSlots,
  type Professional,
  type Service,
} from "@/lib/mock-data";
import {
  api,
  buildStartTimeIso,
  getErrorMessage,
  mapApiProfessional,
  mapApiService,
} from "@/services/api";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Scissors,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const steps = [
  "Serviço",
  "Profissional",
  "Data e horário",
  "Confirmação",
] as const;

const API_LOAD_TIMEOUT_MS = 8_000;

type BookingStep = 1 | 2 | 3 | 4;

type BookingCatalog = {
  services: Service[];
  professionals: Professional[];
  clientId: string | null;
  fromApi: boolean;
};

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("A API demorou para responder.")),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

type BookingFlowProps = {
  embedded?: boolean;
};

export function BookingFlow({ embedded = false }: BookingFlowProps) {
  const { tenant, loading: tenantLoading } = useTenant();
  const tenantId = tenant.id === "local" ? undefined : tenant.id;
  const homeHref = tenantHref(tenant.slug);
  const clientHref = "/cliente";
  const frameClass = embedded
    ? "relative flex flex-1 flex-col pt-2"
    : "relative flex flex-1 flex-col px-5 pb-8 pt-8";
  const availableDates = useMemo(() => getAvailableDates(), []);

  const [step, setStep] = useState<BookingStep>(1);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [fromApi, setFromApi] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [catalogWarning, setCatalogWarning] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProfessional, setSelectedProfessional] =
    useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(availableDates[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedSummary, setConfirmedSummary] = useState<string | null>(null);

  const applyCatalog = useCallback((catalog: BookingCatalog, warning?: string) => {
    setServices(catalog.services);
    setProfessionals(catalog.professionals);
    setClientId(catalog.clientId);
    setFromApi(catalog.fromApi);
    setUsingFallback(!catalog.fromApi);
    setCatalogWarning(warning ?? null);
    setError(null);
  }, []);

  const loadBookingData = useCallback(async () => {
    if (tenantLoading) {
      return;
    }

    setLoading(true);
    setError(null);
    setCatalogWarning(null);

    try {
      const catalog = await withTimeout(fetchBookingCatalog(tenantId), API_LOAD_TIMEOUT_MS);
      applyCatalog(catalog);
    } catch (requestError) {
      const message = getErrorMessage(requestError);
      applyCatalog(
        {
          services: fallbackServices,
          professionals: fallbackProfessionals,
          clientId: null,
          fromApi: false,
        },
        `${message} Exibindo catálogo local — a confirmação exige a API.`,
      );
    } finally {
      setLoading(false);
    }
  }, [applyCatalog, tenantId, tenantLoading]);

  useEffect(() => {
    void loadBookingData();
  }, [loadBookingData]);

  async function handleConfirm() {
    if (!selectedService || !selectedProfessional || !selectedTime) {
      setSubmitError("Revise serviço, profissional e horário antes de confirmar.");
      return;
    }

    if (!fromApi || !tenantId) {
      setSubmitError(
        "Não foi possível conectar à API. Verifique se o backend está em http://localhost:3000 e tente novamente.",
      );
      return;
    }

    if (!clientId) {
      setSubmitError(
        "Nenhum cliente cadastrado no tenant. Crie um usuário CUSTOMER via POST /users.",
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await api.createAppointment({
        tenantId,
        clientId,
        professionalId: selectedProfessional.id,
        serviceId: selectedService.id,
        startTime: buildStartTimeIso(selectedDate, selectedTime),
        status: "CONFIRMED",
      });

      setConfirmedSummary(
        `${selectedService.name} com ${selectedProfessional.name} em ${formatShortDate(selectedDate)} às ${selectedTime}.`,
      );
      setConfirmed(true);
    } catch (requestError) {
      setSubmitError(
        getFriendlySubmitError(getErrorMessage(requestError)),
      );
    } finally {
      setSubmitting(false);
    }
  }

  const canContinue =
    (step === 1 && selectedService !== null) ||
    (step === 2 && selectedProfessional !== null) ||
    (step === 3 && selectedTime !== null) ||
    step === 4;

  function handleNext() {
    if (step < 4) {
      setStep((current) => (current + 1) as BookingStep);
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep((current) => (current - 1) as BookingStep);
      setSubmitError(null);
    }
  }

  const heading = embedded ? (
    <div className="mb-6">
      <h2 className="text-xl font-bold tracking-tight text-zinc-50">
        Agendar horário
      </h2>
      <p className="mt-1 text-sm text-zinc-400">
        {tenant.name} · escolha serviço, profissional e horário
      </p>
    </div>
  ) : (
    <PageHeader
      title="Agendar horário"
      subtitle={`${tenant.name} · passo a passo`}
      backHref={homeHref}
    />
  );

  if (tenantLoading || loading) {
    return (
      <div className={frameClass}>
        {heading}
        <LoadingState message="Carregando serviços e profissionais..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={frameClass}>
        {heading}
        <ErrorState message={error} onRetry={() => void loadBookingData()} />
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className={frameClass}>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="inline-flex size-20 items-center justify-center rounded-3xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="size-10" strokeWidth={2.2} />
          </span>
          <h1 className="mt-6 text-2xl font-bold text-zinc-50">
            Agendamento confirmado!
          </h1>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-400">
            {confirmedSummary}
          </p>
          <p className="mt-2 text-xs text-emerald-400/90">
            Salvo com sucesso no servidor.
          </p>
          <Link
            href={clientHref}
            className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-4 text-sm font-semibold text-zinc-950"
          >
            Ver na Área do Cliente
          </Link>
          <Link
            href={homeHref}
            className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-zinc-800 px-5 py-3 text-sm font-medium text-zinc-300"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={frameClass}>
      {heading}

      {catalogWarning || usingFallback ? (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-400" />
          <div className="min-w-0 flex-1">
            <p>{catalogWarning ?? "Usando dados locais temporariamente."}</p>
            <button
              type="button"
              onClick={() => void loadBookingData()}
              className="mt-1 text-xs font-medium text-amber-300 underline"
            >
              Tentar conectar à API novamente
            </button>
          </div>
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-4 gap-2">
        {steps.map((label, index) => {
          const stepNumber = (index + 1) as BookingStep;
          const isActive = step === stepNumber;
          const isDone = step > stepNumber;

          return (
            <div key={label} className="flex flex-col items-center gap-2">
              <span
                className={`inline-flex size-8 items-center justify-center rounded-full text-xs font-semibold ${
                  isActive
                    ? "bg-amber-400 text-zinc-950"
                    : isDone
                      ? "bg-amber-400/20 text-amber-400"
                      : "bg-zinc-900 text-zinc-500 ring-1 ring-zinc-800"
                }`}
              >
                {stepNumber}
              </span>
              <span className="text-center text-[10px] leading-tight text-zinc-500">
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {step === 1 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200">
            Escolha o serviço
          </h2>
          {services.length === 0 ? (
            <EmptyListMessage message="Nenhum serviço disponível no momento." />
          ) : (
            services.map((service) => {
              const isSelected = selectedService?.id === service.id;

              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setSelectedService(service)}
                  className={`flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
                    isSelected
                      ? "border-amber-400/60 bg-amber-400/10"
                      : "border-zinc-800 bg-zinc-900/80 hover:border-zinc-700"
                  }`}
                >
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-amber-400 ring-1 ring-zinc-800">
                    <Scissors className="size-5" strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-zinc-100">
                        {service.name}
                      </span>
                      <span className="text-sm font-semibold text-amber-400">
                        {formatCurrency(service.price)}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-zinc-400">
                      {service.description}
                    </span>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-500">
                      <Clock3 className="size-3.5" />
                      {service.durationMinutes} min
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-200">
            Escolha o profissional
          </h2>
          {professionals.length === 0 ? (
            <EmptyListMessage message="Nenhum profissional disponível no momento." />
          ) : (
            professionals.map((professional) => {
              const isSelected = selectedProfessional?.id === professional.id;

              return (
                <button
                  key={professional.id}
                  type="button"
                  onClick={() => setSelectedProfessional(professional)}
                  className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
                    isSelected
                      ? "border-amber-400/60 bg-amber-400/10"
                      : "border-zinc-800 bg-zinc-900/80 hover:border-zinc-700"
                  }`}
                >
                  <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-amber-400 ring-1 ring-zinc-800">
                    <UserRound className="size-5" strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-zinc-100">
                      {professional.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-zinc-400">
                      {professional.role}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400">
                    <Star className="size-3.5 fill-amber-400" />
                    {professional.rating.toFixed(1)}
                  </span>
                </button>
              );
            })
          )}
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">
              Escolha a data
            </h2>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {availableDates.map((date) => {
                const isSelected =
                  selectedDate.toDateString() === date.toDateString();

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={`min-w-20 shrink-0 rounded-2xl border px-3 py-3 text-center transition ${
                      isSelected
                        ? "border-amber-400/60 bg-amber-400/10 text-amber-300"
                        : "border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    <span className="block text-[10px] uppercase tracking-wide text-zinc-500">
                      {date.toLocaleDateString("pt-BR", { weekday: "short" })}
                    </span>
                    <span className="mt-1 block text-sm font-semibold">
                      {date.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-zinc-200">
              Horários disponíveis
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {timeSlots.map((slot) => {
                const isSelected = selectedTime === slot.label;

                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setSelectedTime(slot.label)}
                    className={`rounded-xl border px-3 py-3 text-sm font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
                      isSelected
                        ? "border-amber-400/60 bg-amber-400/10 text-amber-300"
                        : "border-zinc-800 bg-zinc-900/80 text-zinc-200 hover:border-zinc-700"
                    }`}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {step === 4 && selectedService && selectedProfessional && selectedTime ? (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200">
            Revise seu agendamento
          </h2>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <div className="space-y-4">
              <SummaryRow
                icon={Scissors}
                label="Serviço"
                value={selectedService.name}
                detail={`${formatCurrency(selectedService.price)} · ${selectedService.durationMinutes} min`}
              />
              <SummaryRow
                icon={UserRound}
                label="Profissional"
                value={selectedProfessional.name}
                detail={selectedProfessional.role}
              />
              <SummaryRow
                icon={CalendarDays}
                label="Data e horário"
                value={`${formatShortDate(selectedDate)} · ${selectedTime}`}
                detail={tenant.name}
              />
            </div>
          </div>

          {submitError ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-400" />
              <p>{submitError}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="mt-auto flex gap-3 pt-8">
        {step > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            disabled={submitting}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-2xl border border-zinc-800 px-4 py-4 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
            Voltar
          </button>
        ) : null}

        {step < 4 ? (
          <button
            type="button"
            disabled={!canContinue}
            onClick={handleNext}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-4 text-sm font-semibold text-zinc-950 transition enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continuar
            <ChevronRight className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={!canContinue || submitting}
            onClick={() => void handleConfirm()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-4 text-sm font-semibold text-zinc-950 transition enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Confirmando...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Confirmar agendamento
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

async function fetchBookingCatalog(
  tenantId?: string,
): Promise<BookingCatalog> {
  const [servicesResponse, professionalsResponse, customersResponse] =
    await Promise.all([
      api.getServices(tenantId),
      api.getUsers({ role: "PROFESSIONAL", tenantId }),
      api.getUsers({ role: "CUSTOMER", tenantId }),
    ]);

  return {
    services: servicesResponse.map(mapApiService),
    professionals: professionalsResponse.map(mapApiProfessional),
    clientId: customersResponse[0]?.id ?? null,
    fromApi: true,
  };
}

function getFriendlySubmitError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("indisponível") || normalized.includes("conflito")) {
    return "Esse horário acabou de ficar indisponível. Escolha outro horário e tente novamente.";
  }

  if (normalized.includes("network") || normalized.includes("fetch")) {
    return "Não foi possível falar com o servidor. Confira se a API está rodando na porta 3000.";
  }

  return message || "Não foi possível confirmar o agendamento. Tente novamente.";
}

type SummaryRowProps = {
  icon: typeof Scissors;
  label: string;
  value: string;
  detail: string;
};

function SummaryRow({ icon: Icon, label, value, detail }: SummaryRowProps) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-amber-400 ring-1 ring-zinc-800">
        <Icon className="size-4" strokeWidth={2.2} />
      </span>
      <span>
        <span className="block text-xs uppercase tracking-wide text-zinc-500">
          {label}
        </span>
        <span className="mt-1 block text-sm font-semibold text-zinc-100">
          {value}
        </span>
        <span className="mt-0.5 block text-xs text-zinc-400">{detail}</span>
      </span>
    </div>
  );
}

function EmptyListMessage({ message }: { message: string }) {
  return (
    <p className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-6 text-center text-sm text-zinc-400">
      {message}
    </p>
  );
}
