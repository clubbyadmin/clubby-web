"use client";

import { LoadingState } from "@/components/api-state";
import { AdminNav } from "@/components/admin-nav";
import { AccentIconWrap } from "@/components/shell/accent-ui";
import { TenantBadge } from "@/components/tenant-brand";
import { useTenant } from "@/contexts/tenant-context";
import { StaffSelect } from "@/components/staff-select";
import { cn } from "@/lib/cn";
import {
  appointmentCoversSlot,
  appointmentStartsAtSlot,
  formatDateKey,
  formatDisplayDate,
  generateTimeSlots,
  minutesToLabel,
  slotSpan,
  statusLabels,
  statusStyles,
  type ScheduleAppointment,
} from "@/lib/schedule-data";
import {
  api,
  buildStartTimeIso,
  dayRangeIso,
  getErrorMessage,
  mapApiAppointmentToSchedule,
  type ApiWaitlistEntry,
} from "@/services/api";
import { WaitlistPanel } from "./waitlist-panel";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MoreHorizontal,
  RefreshCw,
  UserRound,
  X,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

type StaffMember = {
  id: string;
  name: string;
  email: string | null;
};

type ServiceOption = {
  id: string;
  name: string;
  durationMinutes: number;
};

type CustomerOption = {
  id: string;
  name: string;
};

export function ScheduleBoard() {
  const { tenant } = useTenant();
  const tenantId = tenant.id === "local" ? undefined : tenant.id;
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [dayAppointments, setDayAppointments] = useState<ScheduleAppointment[]>(
    [],
  );
  const [waitlist, setWaitlist] = useState<ApiWaitlistEntry[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [loadingWaitlist, setLoadingWaitlist] = useState(false);
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [emptyChairNotice, setEmptyChairNotice] = useState<string | null>(null);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(
    null,
  );
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkInSubmitting, setWalkInSubmitting] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [walkInForm, setWalkInForm] = useState({
    clientId: "",
    serviceId: "",
    staffId: "",
    startTime: "09:00",
  });

  const timeSlots = useMemo(() => generateTimeSlots(), []);

  const loadStaff = useCallback(async () => {
    setLoadingStaff(true);
    setStaffError(null);

    try {
      const [staffResponse, servicesResponse, customersResponse] =
        await Promise.all([
          api.getUsers({ role: "PROFESSIONAL", tenantId }),
          api.getServices(tenantId),
          api.getUsers({ role: "CUSTOMER", tenantId }),
        ]);

      const mappedStaff = staffResponse.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
      }));
      const mappedServices = servicesResponse.map((service) => ({
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMin,
      }));
      const mappedCustomers = customersResponse.map((user) => ({
        id: user.id,
        name: user.name,
      }));

      setStaff(mappedStaff);
      setServices(mappedServices);
      setCustomers(mappedCustomers);
      setWalkInForm((current) => ({
        ...current,
        staffId: current.staffId || mappedStaff[0]?.id || "",
        serviceId: current.serviceId || mappedServices[0]?.id || "",
        clientId: current.clientId || mappedCustomers[0]?.id || "",
      }));
    } catch (requestError) {
      setStaffError(getErrorMessage(requestError));
      setStaff([]);
    } finally {
      setLoadingStaff(false);
    }
  }, [tenantId]);

  const loadAppointments = useCallback(async () => {
    if (!tenantId) {
      setDayAppointments([]);
      setLoadingAppointments(false);
      return;
    }

    setLoadingAppointments(true);
    setAppointmentsError(null);

    try {
      const range = dayRangeIso(selectedDate);
      const response = await api.getAppointments({
        tenantId,
        from: range.from,
        to: range.to,
      });

      setDayAppointments(response.map(mapApiAppointmentToSchedule));
    } catch (requestError) {
      setAppointmentsError(getErrorMessage(requestError));
      setDayAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  }, [selectedDate, tenantId]);

  const loadWaitlist = useCallback(async () => {
    if (!tenantId) {
      setWaitlist([]);
      return;
    }

    setLoadingWaitlist(true);

    try {
      const response = await api.getWaitlist({
        tenantId,
        date: formatDateKey(selectedDate),
        status: "WAITING",
      });
      setWaitlist(response);
    } catch (requestError) {
      setAppointmentsError(getErrorMessage(requestError));
      setWaitlist([]);
    } finally {
      setLoadingWaitlist(false);
    }
  }, [selectedDate, tenantId]);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    void loadWaitlist();
  }, [loadWaitlist]);

  const visibleStaff = useMemo(() => {
    if (selectedStaffId === "all") {
      return staff;
    }

    return staff.filter((member) => member.id === selectedStaffId);
  }, [selectedStaffId, staff]);

  const filteredAppointments = useMemo(() => {
    if (selectedStaffId === "all") {
      return dayAppointments.filter((item) => item.status !== "CANCELLED");
    }

    return dayAppointments.filter(
      (item) =>
        item.staffId === selectedStaffId && item.status !== "CANCELLED",
    );
  }, [dayAppointments, selectedStaffId]);

  function shiftDate(days: number) {
    setSelectedDate((current) => {
      const next = new Date(current);
      next.setDate(current.getDate() + days);
      return next;
    });
  }

  async function handleComplete(appointmentId: string) {
    setActiveMenuId(null);

    try {
      await api.updateAppointment(appointmentId, { status: "COMPLETED" });
      await loadAppointments();
    } catch (requestError) {
      setAppointmentsError(getErrorMessage(requestError));
    }
  }

  async function handleCancel(appointmentId: string) {
    setActiveMenuId(null);
    setEmptyChairNotice(null);

    try {
      const result = await api.cancelAppointment(appointmentId);
      await Promise.all([loadAppointments(), loadWaitlist()]);

      if (result.emptyChair.filled && result.emptyChair.waitlistEntry) {
        const entry = result.emptyChair.waitlistEntry;
        setEmptyChairNotice(
          `Cadeira preenchida: ${entry.client.name} entrou às ${entry.targetTimeSlot} (${entry.service.name}).`,
        );
      }
    } catch (requestError) {
      setAppointmentsError(getErrorMessage(requestError));
    }
  }

  async function handleJoinWaitlist(form: {
    clientId: string;
    serviceId: string;
    staffId: string;
    startTime: string;
  }) {
    if (!tenantId || !form.clientId || !form.serviceId) {
      setAppointmentsError("Selecione cliente e serviço para entrar na fila.");
      return;
    }

    setWaitlistSubmitting(true);
    setAppointmentsError(null);

    try {
      await api.joinWaitlist({
        tenantId,
        clientId: form.clientId,
        serviceId: form.serviceId,
        preferredProfessionalId:
          form.staffId && form.staffId !== "all" ? form.staffId : null,
        targetDate: formatDateKey(selectedDate),
        targetTimeSlot: form.startTime,
      });
      await loadWaitlist();
    } catch (requestError) {
      setAppointmentsError(getErrorMessage(requestError));
      throw requestError;
    } finally {
      setWaitlistSubmitting(false);
    }
  }

  async function handleReschedule(appointmentId: string, newStartTime: string) {
    setRescheduleId(null);

    try {
      await api.updateAppointment(appointmentId, {
        startTime: buildStartTimeIso(selectedDate, newStartTime),
        status: "CONFIRMED",
      });
      await loadAppointments();
    } catch (requestError) {
      setAppointmentsError(getErrorMessage(requestError));
    }
  }

  async function handleWalkInSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tenantId || !walkInForm.clientId || !walkInForm.serviceId) {
      setAppointmentsError(
        "Selecione cliente e serviço para confirmar o encaixe.",
      );
      return;
    }

    setWalkInSubmitting(true);
    setAppointmentsError(null);

    try {
      await api.createAppointment({
        tenantId,
        clientId: walkInForm.clientId,
        professionalId: walkInForm.staffId,
        serviceId: walkInForm.serviceId,
        startTime: buildStartTimeIso(selectedDate, walkInForm.startTime),
        status: "CONFIRMED",
      });

      setWalkInOpen(false);
      setWalkInForm((current) => ({
        ...current,
        clientId: customers[0]?.id ?? "",
        serviceId: services[0]?.id ?? "",
        staffId: staff[0]?.id ?? "",
        startTime: "09:00",
      }));
      await loadAppointments();
    } catch (requestError) {
      setAppointmentsError(getErrorMessage(requestError));
    } finally {
      setWalkInSubmitting(false);
    }
  }

  if (loadingStaff && staff.length === 0) {
    return (
      <div className="px-4 pb-4 pt-6 md:px-6">
        <LoadingState message="Carregando profissionais..." />
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col px-4 pb-4 pt-6 sm:px-6 lg:px-10 xl:px-12">
      <header className="mb-4 flex flex-col gap-4 lg:mb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <TenantBadge />
          <p className="mt-3 text-sm text-zinc-400">
            Grade de agendamentos · {tenant.name}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setWalkInOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
        >
          <CalendarPlus className="size-4" />
          Walk-in / encaixe manual
        </button>
      </header>

      <AdminNav className="mb-4 lg:hidden" />

      {staffError ? (
        <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {staffError}
          <button
            type="button"
            onClick={() => void loadStaff()}
            className="ml-2 underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      {appointmentsError ? (
        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {appointmentsError}
          <button
            type="button"
            onClick={() => void loadAppointments()}
            className="ml-2 underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      {emptyChairNotice ? (
        <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {emptyChairNotice}
        </div>
      ) : null}

      <section className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
          <button
            type="button"
            onClick={() => shiftDate(-1)}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-zinc-800 text-zinc-300 hover:border-zinc-700"
            aria-label="Dia anterior"
          >
            <ChevronLeft className="size-5" />
          </button>

          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Data</p>
            <p className="text-sm font-semibold capitalize text-zinc-100">
              {formatDisplayDate(selectedDate)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => shiftDate(1)}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-zinc-800 text-zinc-300 hover:border-zinc-700"
            aria-label="Próximo dia"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setSelectedDate(new Date())}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm font-medium text-zinc-200 hover:border-zinc-700"
        >
          Hoje
        </button>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-3 py-2.5 sm:min-w-[280px]">
          <span className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">
            Profissional
          </span>
          <StaffSelect
            value={selectedStaffId}
            onChange={setSelectedStaffId}
            staff={staff}
            includeAll
          />
        </div>
      </section>

      <WaitlistPanel
        entries={waitlist}
        loading={loadingWaitlist}
        staff={staff}
        services={services}
        customers={customers}
        submitting={waitlistSubmitting}
        onJoin={handleJoinWaitlist}
      />

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
        {loadingAppointments ? (
          <div className="p-8">
            <LoadingState message="Carregando agendamentos do dia..." />
          </div>
        ) : visibleStaff.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            Nenhum profissional cadastrado para exibir a grade.
          </div>
        ) : (
        <div className="overflow-x-auto lg:overflow-visible">
          <div
            className="grid w-full min-w-[640px] lg:min-w-0"
            style={{
              gridTemplateColumns: `72px repeat(${visibleStaff.length}, minmax(140px, 1fr))`,
            }}
          >
            <div className="sticky top-0 z-20 border-b border-r border-zinc-800 bg-zinc-950/95 px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 backdrop-blur">
              Horário
            </div>
            {visibleStaff.map((member) => (
              <div
                key={`head-${member.id}`}
                className="sticky top-0 z-20 border-b border-r border-zinc-800 bg-zinc-950/95 px-3 py-3 last:border-r-0 backdrop-blur"
              >
                <div className="flex items-center gap-2">
                  <AccentIconWrap className="size-8 rounded-full">
                    <UserRound className="size-3.5" />
                  </AccentIconWrap>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-zinc-100">
                      {member.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
                      {member.email || "Sem e-mail"}
                    </span>
                  </span>
                </div>
              </div>
            ))}

            {timeSlots.map((slotMinutes) => (
              <Fragment key={`row-${slotMinutes}`}>
                <div className="border-b border-r border-zinc-800 px-3 py-4 text-xs font-medium text-zinc-500">
                  {minutesToLabel(slotMinutes)}
                </div>

                {visibleStaff.map((member) => {
                  const cellKey = `${member.id}-${slotMinutes}`;
                  const startingAppointment = filteredAppointments.find(
                    (item) =>
                      item.staffId === member.id &&
                      appointmentStartsAtSlot(item, slotMinutes),
                  );

                  if (startingAppointment) {
                    const span = slotSpan(startingAppointment.durationMinutes);

                    return (
                      <div
                        key={cellKey}
                        className="border-b border-r border-zinc-800 p-2 last:border-r-0"
                        style={{ gridRow: `span ${span}` }}
                      >
                        <AppointmentCard
                          appointment={startingAppointment}
                          span={span}
                          isMenuOpen={activeMenuId === startingAppointment.id}
                          isRescheduling={
                            rescheduleId === startingAppointment.id
                          }
                          onToggleMenu={() =>
                            setActiveMenuId((current) =>
                              current === startingAppointment.id
                                ? null
                                : startingAppointment.id,
                            )
                          }
                          onComplete={() =>
                            void handleComplete(startingAppointment.id)
                          }
                          onCancel={() =>
                            void handleCancel(startingAppointment.id)
                          }
                          onStartReschedule={() =>
                            setRescheduleId(startingAppointment.id)
                          }
                          onReschedule={(time) =>
                            void handleReschedule(startingAppointment.id, time)
                          }
                          onCloseReschedule={() => setRescheduleId(null)}
                        />
                      </div>
                    );
                  }

                  const isContinuation = filteredAppointments.some(
                    (item) =>
                      item.staffId === member.id &&
                      appointmentCoversSlot(item, slotMinutes) &&
                      !appointmentStartsAtSlot(item, slotMinutes),
                  );

                  if (isContinuation) {
                    return (
                      <div
                        key={cellKey}
                        className="border-b border-r border-zinc-800 bg-zinc-950/40 last:border-r-0"
                      />
                    );
                  }

                  return (
                    <button
                      key={cellKey}
                      type="button"
                      onClick={() => {
                        setWalkInForm((current) => ({
                          ...current,
                          staffId: member.id,
                          startTime: minutesToLabel(slotMinutes),
                        }));
                        setWalkInOpen(true);
                      }}
                      className="group min-h-16 border-b border-r border-zinc-800 p-2 text-left transition last:border-r-0 hover:bg-[color-mix(in_srgb,var(--accent)_6%,transparent)]"
                    >
                      <span className="text-[11px] font-medium text-zinc-600 group-hover:text-[var(--accent)]">
                        Livre · encaixe rápido
                      </span>
                    </button>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
        )}
      </section>

      <p className="mt-4 text-xs text-zinc-500">
        Agenda sincronizada com a API em tempo real. Alterações de status e
        remarcações são persistidas no servidor.
      </p>

      {walkInOpen ? (
        <WalkInModal
          form={walkInForm}
          staff={staff}
          services={services}
          customers={customers}
          timeSlots={timeSlots}
          submitting={walkInSubmitting}
          onClose={() => setWalkInOpen(false)}
          onChange={setWalkInForm}
          onSubmit={(event) => void handleWalkInSubmit(event)}
        />
      ) : null}
    </div>
  );
}

type AppointmentCardProps = {
  appointment: ScheduleAppointment;
  span: number;
  isMenuOpen: boolean;
  isRescheduling: boolean;
  onToggleMenu: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onStartReschedule: () => void;
  onReschedule: (time: string) => void;
  onCloseReschedule: () => void;
};

function AppointmentCard({
  appointment,
  span,
  isMenuOpen,
  isRescheduling,
  onToggleMenu,
  onComplete,
  onCancel,
  onStartReschedule,
  onReschedule,
  onCloseReschedule,
}: AppointmentCardProps) {
  return (
    <div
      className={cn(
        "relative flex h-full min-h-[calc(var(--slot-span)*4rem)] flex-col rounded-xl border p-3 ring-1",
        statusStyles[appointment.status],
      )}
      style={{ ["--slot-span" as string]: span }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-50">
            {appointment.customerName}
          </p>
          <p className="mt-1 text-xs opacity-90">{appointment.serviceName}</p>
        </div>
        <button
          type="button"
          onClick={onToggleMenu}
          className="rounded-lg p-1 hover:bg-black/20"
          aria-label="Ações do agendamento"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide">
          <Clock3 className="size-3.5" />
          {minutesToLabel(appointment.startMinutes)}
        </span>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase">
          {statusLabels[appointment.status]}
        </span>
      </div>

      {isMenuOpen ? (
        <div className="absolute right-2 top-10 z-30 min-w-44 rounded-xl border border-zinc-700 bg-zinc-950 p-1 shadow-xl">
          <ActionButton label="Concluir atendimento" onClick={onComplete} />
          <ActionButton label="Remarcar" onClick={onStartReschedule} />
          <ActionButton
            label="Cancelar"
            onClick={onCancel}
            destructive
          />
        </div>
      ) : null}

      {isRescheduling ? (
        <div className="absolute inset-x-2 bottom-2 z-30 rounded-xl border border-zinc-700 bg-zinc-950 p-2 shadow-xl">
          <label className="block text-[11px] text-zinc-400">
            Novo horário
            <select
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
              defaultValue={minutesToLabel(appointment.startMinutes)}
              onChange={(event) => onReschedule(event.target.value)}
            >
              {generateTimeSlots().map((slot) => (
                <option key={slot} value={minutesToLabel(slot)}>
                  {minutesToLabel(slot)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={onCloseReschedule}
            className="mt-2 text-[11px] text-zinc-500 underline"
          >
            Fechar
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  destructive = false,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition hover:bg-zinc-900",
        destructive ? "text-red-400" : "text-zinc-200",
      )}
    >
      {label === "Remarcar" ? (
        <RefreshCw className="size-3.5" />
      ) : null}
      {label}
    </button>
  );
}

type WalkInModalProps = {
  form: {
    clientId: string;
    serviceId: string;
    staffId: string;
    startTime: string;
  };
  staff: StaffMember[];
  services: ServiceOption[];
  customers: CustomerOption[];
  timeSlots: number[];
  submitting: boolean;
  onClose: () => void;
  onChange: React.Dispatch<
    React.SetStateAction<WalkInModalProps["form"]>
  >;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

function WalkInModal({
  form,
  staff,
  services,
  customers,
  timeSlots,
  submitting,
  onClose,
  onChange,
  onSubmit,
}: WalkInModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 md:items-center">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-50">
            Agendamento walk-in
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-800 p-2 text-zinc-400"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Cliente">
            <select
              value={form.clientId}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  clientId: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none [color-scheme:dark]"
            >
              {customers.length === 0 ? (
                <option value="">Nenhum cliente cadastrado</option>
              ) : (
                customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))
              )}
            </select>
          </Field>

          <Field label="Serviço">
            <select
              value={form.serviceId}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  serviceId: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none [color-scheme:dark]"
            >
              {services.length === 0 ? (
                <option value="">Nenhum serviço cadastrado</option>
              ) : (
                services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))
              )}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Profissional">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5">
                <StaffSelect
                  value={form.staffId}
                  onChange={(staffId) =>
                    onChange((current) => ({ ...current, staffId }))
                  }
                  staff={staff}
                  placeholder="Escolher barbeiro"
                />
              </div>
            </Field>

            <Field label="Horário">
              <select
                value={form.startTime}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    startTime: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none [color-scheme:dark]"
              >
                {timeSlots.map((slot) => (
                  <option key={slot} value={minutesToLabel(slot)}>
                    {minutesToLabel(slot)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <button
            type="submit"
            disabled={submitting || !form.clientId || !form.serviceId}
            className="w-full rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50"
          >
            {submitting ? "Salvando..." : "Confirmar encaixe"}
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
