"use client";

import { ErrorState, LoadingState } from "@/components/api-state";
import { PageHeader } from "@/components/page-header";
import {
  formatCurrency,
  formatShortDate,
  getAvailableDates,
  timeSlots,
  type Professional,
  type Service,
} from "@/lib/mock-data";
import {
  api,
  getErrorMessage,
  mapApiProfessional,
  mapApiService,
} from "@/services/api";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
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

type BookingStep = 1 | 2 | 3 | 4;

export function BookingFlow() {
  const availableDates = useMemo(() => getAvailableDates(), []);
  const [step, setStep] = useState<BookingStep>(1);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProfessional, setSelectedProfessional] =
    useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(availableDates[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const loadBookingData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [servicesResponse, professionalsResponse] = await Promise.all([
        api.getServices(),
        api.getUsers({ role: "STAFF" }),
      ]);

      setServices(servicesResponse.map(mapApiService));
      setProfessionals(professionalsResponse.map(mapApiProfessional));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([api.getServices(), api.getUsers({ role: "STAFF" })])
      .then(([servicesResponse, professionalsResponse]) => {
        if (cancelled) {
          return;
        }

        setServices(servicesResponse.map(mapApiService));
        setProfessionals(professionalsResponse.map(mapApiProfessional));
        setLoading(false);
      })
      .catch((requestError: unknown) => {
        if (cancelled) {
          return;
        }

        setError(getErrorMessage(requestError));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
    }
  }

  if (loading) {
    return (
      <div className="relative flex flex-1 flex-col px-5 pb-8 pt-8">
        <PageHeader
          title="Agendar horário"
          subtitle="Studio Barbearia · passo a passo"
        />
        <LoadingState message="Carregando serviços e profissionais..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex flex-1 flex-col px-5 pb-8 pt-8">
        <PageHeader
          title="Agendar horário"
          subtitle="Studio Barbearia · passo a passo"
        />
        <ErrorState message={error} onRetry={() => void loadBookingData()} />
      </div>
    );
  }

  if (confirmed && selectedService && selectedProfessional && selectedTime) {
    return (
      <div className="relative flex flex-1 flex-col px-5 pb-8 pt-8">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="inline-flex size-20 items-center justify-center rounded-3xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="size-10" strokeWidth={2.2} />
          </span>
          <h1 className="mt-6 text-2xl font-bold text-zinc-50">
            Agendamento confirmado!
          </h1>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-400">
            {selectedService.name} com {selectedProfessional.name} em{" "}
            {formatShortDate(selectedDate)} às {selectedTime}.
          </p>
          <Link
            href="/cliente"
            className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-4 text-sm font-semibold text-zinc-950"
          >
            Ver na Área do Cliente
          </Link>
          <Link
            href="/"
            className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-zinc-800 px-5 py-3 text-sm font-medium text-zinc-300"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col px-5 pb-8 pt-8">
      <PageHeader
        title="Agendar horário"
        subtitle="Studio Barbearia · passo a passo"
      />

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
                detail="Studio Barbearia"
              />
            </div>
          </div>
        </section>
      ) : null}

      <div className="mt-auto flex gap-3 pt-8">
        {step > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-2xl border border-zinc-800 px-4 py-4 text-sm font-medium text-zinc-300 transition hover:border-zinc-700"
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
            disabled={!canContinue}
            onClick={() => setConfirmed(true)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-4 text-sm font-semibold text-zinc-950 transition enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Sparkles className="size-4" />
            Confirmar agendamento
          </button>
        )}
      </div>
    </div>
  );
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
