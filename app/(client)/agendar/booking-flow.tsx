"use client";

import { ErrorState, LoadingState } from "@/components/api-state";
import { PageHeader } from "@/components/page-header";
import { useTenant } from "@/contexts/tenant-context";
import { readStoredAdminUser } from "@/lib/admin-session-storage";
import { formatDateKey } from "@/lib/schedule-data";
import { tenantHref } from "@/lib/tenant-paths";
import {
  formatCurrency,
  formatShortDate,
  getAvailableDates,
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProfessional, setSelectedProfessional] =
    useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(availableDates[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [openSlots, setOpenSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedSummary, setConfirmedSummary] = useState<string | null>(null);

  const applyCatalog = useCallback((catalog: BookingCatalog) => {
    setServices(catalog.services);
    setProfessionals(catalog.professionals);
    setClientId(catalog.clientId);
    setFromApi(catalog.fromApi);
    setError(null);
  }, []);

  const loadBookingData = useCallback(async () => {
    if (tenantLoading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const catalog = await withTimeout(fetchBookingCatalog(tenantId), API_LOAD_TIMEOUT_MS);
      applyCatalog(catalog);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setServices([]);
      setProfessionals([]);
      setClientId(null);
      setFromApi(false);
    } finally {
      setLoading(false);
    }
  }, [applyCatalog, tenantId, tenantLoading]);

  useEffect(() => {
    void loadBookingData();

    function onCustomerSession() {
      void loadBookingData();
    }

    window.addEventListener("clubby-customer-session", onCustomerSession);
    return () => window.removeEventListener("clubby-customer-session", onCustomerSession);
  }, [loadBookingData]);

  useEffect(() => {
    if (!tenantId || !selectedService || !selectedProfessional) {
      setOpenSlots([]);
      return;
    }

    let cancelled = false;
    setLoadingSlots(true);

    api
      .getAvailability({
        tenantId,
        professionalId: selectedProfessional.id,
        serviceId: selectedService.id,
        date: formatDateKey(selectedDate),
      })
      .then((result) => {
        if (cancelled) {
          return;
        }

        setOpenSlots(result.slots);
        setSelectedTime((current) =>
          current && result.slots.includes(current) ? current : null,
        );
      })
      .catch(() => {
        if (!cancelled) {
          setOpenSlots([]);
          setSelectedTime(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSlots(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate, selectedProfessional, selectedService, tenantId]);

  async function handleConfirm() {
    if (!selectedService || !selectedProfessional || !selectedTime) {
      setSubmitError("Revise serviço, profissional e horário antes de confirmar.");
      return;
    }

    if (!fromApi || !tenantId) {
      setSubmitError(
        "Não foi possível falar com o salão agora. Tente de novo em instantes.",
      );
      return;
    }

    if (!clientId) {
      setSubmitError(
        "Entre com a conta do cliente para confirmar este horário.",
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

      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
          <span>
            {step} de {steps.length}
          </span>
          <span className="text-zinc-300">{steps[step - 1]}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all"
            style={{ width: `${(step / steps.length) * 100}%` }}
          />
        </div>
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
              {loadingSlots ? (
                <p className="text-sm text-zinc-500">Olhando os horários livres...</p>
              ) : openSlots.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  Não há horário livre nesse dia para esse profissional.
                </p>
              ) : null}
              {openSlots.map((slot) => {
                const isSelected = selectedTime === slot;

                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className={`rounded-xl border px-3 py-3 text-sm font-medium transition active:scale-[0.98] ${
                      isSelected
                        ? "border-amber-400/60 bg-amber-400/10 text-amber-300"
                        : "border-zinc-800 bg-zinc-900/80 text-zinc-200 hover:border-zinc-700"
                    }`}
                  >
                    {slot}
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
            <>Confirmar agendamento</>
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
  const [servicesResponse, professionalsResponse] = await Promise.all([
    api.getServices(tenantId),
    api.getUsers({ role: "PROFESSIONAL", tenantId }),
  ]);
  const session = readStoredAdminUser();

  return {
    services: servicesResponse.map(mapApiService),
    professionals: professionalsResponse.map(mapApiProfessional),
    clientId: session?.role === "CUSTOMER" ? session.id : null,
    fromApi: true,
  };
}

function getFriendlySubmitError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("indisponível") || normalized.includes("conflito")) {
    return "Esse horário acabou de ficar indisponível. Escolha outro horário e tente novamente.";
  }

  if (normalized.includes("network") || normalized.includes("fetch")) {
    return "Não foi possível falar com o salão agora. Tente de novo em instantes.";
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
