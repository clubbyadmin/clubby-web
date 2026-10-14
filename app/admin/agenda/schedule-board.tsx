"use client";

import { LoadingState } from "@/components/api-state";
import { AdminNav } from "@/components/admin-nav";
import { useTenant } from "@/contexts/tenant-context";
import { StaffSelect } from "@/components/staff-select";
import { cn } from "@/lib/cn";
import {
  appointmentCoversSlot,
  appointmentStartsAtSlot,
  formatDateKey,
  formatDisplayDate,
  generateTimeSlots,
  labelToMinutes,
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
  type ApiOpeningHours,
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
  X,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [openingHours, setOpeningHours] = useState<ApiOpeningHours | null>(null);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(
    null,
  );
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkInSubmitting, setWalkInSubmitting] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const skipWalkInClick = useRef(false);
  const [walkInForm, setWalkInForm] = useState({
    clientId: "",
    serviceId: "",
    staffId: "",
    startTime: "09:00",
  });

  const timeSlots = useMemo(() => {
    const day = openingHours?.days.find(
      (item) => item.dayOfWeek === selectedDate.getDay(),
    );

    if (openingHours && openingHours.days.length > 0 && !day) {
      return [];
    }

    const start = day ? labelToMinutes(day.openTime) : 8 * 60;
    const end = day ? labelToMinutes(day.closeTime) : 20 * 60;
    const slots: number[] = [];

    for (let minutes = start; minutes < end; minutes += 30) {
      slots.push(minutes);
    }

    return slots;
  }, [openingHours, selectedDate]);

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
      if (tenantId) {
        const hours = await api.getOpeningHours(tenantId).catch(() => null);
        setOpeningHours(hours);
      }
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

  async function handleStatus(
    appointmentId: string,
    status: "IN_PROGRESS" | "COMPLETED",
  ) {
    setActiveMenuId(null);

    try {
      const updated = await api.updateAppointment(appointmentId, { status });
      if (status === "COMPLETED") {
        const amount = Number(updated.totalAmount ?? 0);
        const rate = Number(updated.staff.commissionRate ?? 0);
        const commission = Math.round(amount * rate * 100) / 100;
        setCheckoutNotice(
          `Saiu da cadeira. Caixa: R$ ${amount.toFixed(2).replace(".", ",")} · comissão R$ ${commission.toFixed(2).replace(".", ",")}.`,
        );
      }
      await loadAppointments();
    } catch (requestError) {
      setAppointmentsError(getErrorMessage(requestError));
    }
  }

  async function handleMove(
    appointmentId: string,
    staffId: string,
    slotMinutes: number,
  ) {
    const start = new Date(selectedDate);
    start.setHours(Math.floor(slotMinutes / 60), slotMinutes % 60, 0, 0);

    if (start.getTime() <= Date.now()) {
      setAppointmentsError("Esse horário já passou.");
      return;
    }

    try {
      await api.moveAppointment(appointmentId, {
        newProfessionalId: staffId,
        newStartTime: start.toISOString(),
      });
      await Promise.all([loadAppointments(), loadWaitlist()]);
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

      if (result.emptyChair.reason === "OFFERED" && result.emptyChair.waitlistEntry) {
        const entry = result.emptyChair.waitlistEntry;
        setEmptyChairNotice(
          `Ofereci ${entry.targetTimeSlot} para ${entry.client.name}. Se disser sim, o horário entra na grade.`,
        );
      } else if (result.emptyChair.filled && result.emptyChair.waitlistEntry) {
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
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Agenda
          </h1>
          <p className="mt-1 text-sm text-zinc-500">{tenant.name}</p>
        </div>

        <button
          type="button"
          onClick={() => setWalkInOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-zinc-950"
        >
          <CalendarPlus className="size-4" />
          Novo horário
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
      {checkoutNotice ? (
        <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {checkoutNotice}
        </div>
      ) : null}
      {tenantId ? (
        <HoursEditor
          tenantId={tenantId}
          staff={staff}
          hours={openingHours}
          onSaved={setOpeningHours}
        />
      ) : null}

      <section className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-2 py-1.5">
          <button
            type="button"
            onClick={() => shiftDate(-1)}
            className="inline-flex size-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            aria-label="Dia anterior"
          >
            <ChevronLeft className="size-5" />
          </button>

          <p className="truncate text-sm font-medium capitalize text-zinc-100">
            {formatDisplayDate(selectedDate)}
          </p>

          <button
            type="button"
            onClick={() => shiftDate(1)}
            className="inline-flex size-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            aria-label="Próximo dia"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setSelectedDate(new Date())}
          className="rounded-full px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-900"
        >
          Hoje
        </button>

        <div className="sm:min-w-56">
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
                <span className="block truncate text-sm font-semibold text-zinc-100">
                  {member.name}
                </span>
              </div>
            ))}

            {timeSlots.map((slotMinutes) => (
              <Fragment key={`row-${slotMinutes}`}>
                <div
                  className={cn(
                    "border-b border-r border-zinc-800 px-3 py-4 text-xs font-medium text-zinc-500",
                    isCurrentSlot(selectedDate, slotMinutes) &&
                      "bg-amber-400/10 text-amber-300",
                  )}
                >
                  {minutesToLabel(slotMinutes)}
                  {isCurrentSlot(selectedDate, slotMinutes) ? (
                    <span className="mt-1 block text-[10px] uppercase tracking-wide">
                      Agora
                    </span>
                  ) : null}
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
                            void handleStatus(startingAppointment.id, "COMPLETED")
                          }
                          onSeat={() =>
                            void handleStatus(startingAppointment.id, "IN_PROGRESS")
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
                          draggable
                          onDragStart={() => setDraggingId(startingAppointment.id)}
                          onDragEnd={() => setDraggingId(null)}
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

                  if (isBreakSlot(openingHours, selectedDate, member.id, slotMinutes)) {
                    return (
                      <div
                        key={cellKey}
                        className="min-h-16 border-b border-r border-zinc-800 bg-zinc-950/70 p-2 text-[11px] text-zinc-500 last:border-r-0"
                      >
                        Pausa
                      </div>
                    );
                  }

                  return (
                    <button
                      key={cellKey}
                      type="button"
                      onDragOver={(event) => {
                        if (draggingId) {
                          event.preventDefault();
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        skipWalkInClick.current = true;
                        const appointmentId =
                          event.dataTransfer.getData("text/plain") || draggingId;
                        if (appointmentId) {
                          void handleMove(appointmentId, member.id, slotMinutes);
                        }
                        setDraggingId(null);
                      }}
                      onClick={() => {
                        if (skipWalkInClick.current) {
                          skipWalkInClick.current = false;
                          return;
                        }
                        setWalkInForm((current) => ({
                          ...current,
                          staffId: member.id,
                          startTime: minutesToLabel(slotMinutes),
                        }));
                        setWalkInOpen(true);
                      }}
                      className={cn(
                        "group min-h-16 border-b border-r border-zinc-800 p-2 text-left transition last:border-r-0 hover:bg-zinc-900/80",
                        draggingId && "bg-amber-400/5",
                      )}
                    >
                      <span className="text-[11px] font-medium text-transparent group-hover:text-zinc-400">
                        Encaixar
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
  onSeat: () => void;
  onCancel: () => void;
  onStartReschedule: () => void;
  onReschedule: (time: string) => void;
  onCloseReschedule: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
};

function AppointmentCard({
  appointment,
  span,
  isMenuOpen,
  isRescheduling,
  onToggleMenu,
  onComplete,
  onSeat,
  onCancel,
  onStartReschedule,
  onReschedule,
  onCloseReschedule,
  draggable,
  onDragStart,
  onDragEnd,
}: AppointmentCardProps) {
  return (
    <div
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", appointment.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
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
          {appointment.insight ? (
            <p className="mt-1 text-[11px] leading-snug opacity-80">
              {[
                appointment.insight.lastService
                  ? `Último: ${appointment.insight.lastService}`
                  : null,
                appointment.insight.usualProfessional
                  ? `De sempre: ${appointment.insight.usualProfessional}`
                  : null,
                appointment.insight.planRemaining !== null
                  ? `Cota: ${appointment.insight.planRemaining}`
                  : null,
                appointment.insight.missedLast ? "Faltou da última vez" : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
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
          <ActionButton label="Na cadeira" onClick={onSeat} />
          <ActionButton label="Saiu" onClick={onComplete} />
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

function isBreakSlot(
  hours: ApiOpeningHours | null,
  date: Date,
  staffId: string,
  slotMinutes: number,
) {
  const day = hours?.days.find((item) => item.dayOfWeek === date.getDay());
  const windows = [
    day?.lunchStart && day.lunchEnd
      ? { start: labelToMinutes(day.lunchStart), end: labelToMinutes(day.lunchEnd) }
      : null,
    hours?.breaks
      .filter((item) => item.staffId === staffId)
      .map((item) => ({
        start: labelToMinutes(item.start),
        end: labelToMinutes(item.end),
      })) ?? [],
  ].flat();

  return windows.some(
    (item) => item && slotMinutes < item.end && slotMinutes + 30 > item.start,
  );
}

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function HoursEditor({
  tenantId,
  staff,
  hours,
  onSaved,
}: {
  tenantId: string;
  staff: StaffMember[];
  hours: ApiOpeningHours | null;
  onSaved: (hours: ApiOpeningHours) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(() =>
    DAY_NAMES.map((_, dayOfWeek) => {
      const current = hours?.days.find((item) => item.dayOfWeek === dayOfWeek);
      return {
        dayOfWeek,
        closed: hours ? !current : dayOfWeek === 0,
        openTime: current?.openTime ?? "09:00",
        closeTime: current?.closeTime ?? (dayOfWeek === 6 ? "14:00" : "19:00"),
        lunchStart: current?.lunchStart ?? (dayOfWeek === 0 || dayOfWeek === 6 ? "" : "12:00"),
        lunchEnd: current?.lunchEnd ?? (dayOfWeek === 0 || dayOfWeek === 6 ? "" : "13:00"),
      };
    }),
  );
  const [breaks, setBreaks] = useState(() =>
    staff.map((person) => {
      const current = hours?.breaks.find((item) => item.staffId === person.id);
      return { staffId: person.id, start: current?.start ?? "", end: current?.end ?? "" };
    }),
  );

  useEffect(() => {
    setBreaks(
      staff.map((person) => {
        const current = hours?.breaks.find((item) => item.staffId === person.id);
        return { staffId: person.id, start: current?.start ?? "", end: current?.end ?? "" };
      }),
    );
  }, [hours, staff]);

  async function save() {
    setSaving(true);
    setError(null);

    try {
      const saved = await api.saveOpeningHours({
        tenantId,
        days: days.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          openTime: day.openTime,
          closeTime: day.closeTime,
          lunchStart: day.lunchStart || null,
          lunchEnd: day.lunchEnd || null,
          closed: day.closed,
        })),
        breaks: breaks.filter((item) => item.start && item.end),
      });
      onSaved(saved);
      setOpen(false);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="text-sm font-semibold text-zinc-100"
      >
        Horário da casa e pausas
      </button>
      {open ? (
        <div className="mt-4 space-y-4">
          {days.map((day) => (
            <div key={day.dayOfWeek} className="grid gap-2 sm:grid-cols-[4rem_5rem_1fr_1fr_1fr_1fr] sm:items-center">
              <span className="text-xs text-zinc-400">{DAY_NAMES[day.dayOfWeek]}</span>
              <label className="flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={!day.closed}
                  onChange={(event) =>
                    setDays((current) =>
                      current.map((item) =>
                        item.dayOfWeek === day.dayOfWeek
                          ? { ...item, closed: !event.target.checked }
                          : item,
                      ),
                    )
                  }
                />
                Aberto
              </label>
              {(["openTime", "closeTime", "lunchStart", "lunchEnd"] as const).map((field) => (
                <input
                  key={field}
                  value={day[field]}
                  disabled={day.closed}
                  placeholder={field.startsWith("lunch") ? "almoço" : "hora"}
                  onChange={(event) =>
                    setDays((current) =>
                      current.map((item) =>
                        item.dayOfWeek === day.dayOfWeek
                          ? { ...item, [field]: event.target.value }
                          : item,
                      ),
                    )
                  }
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100 disabled:opacity-40"
                />
              ))}
            </div>
          ))}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Pausa de cada profissional
            </p>
            {staff.map((person) => {
              const item = breaks.find((entry) => entry.staffId === person.id);
              return (
                <div key={person.id} className="grid gap-2 sm:grid-cols-[1fr_6rem_6rem] sm:items-center">
                  <span className="text-sm text-zinc-200">{person.name}</span>
                  <input
                    value={item?.start ?? ""}
                    placeholder="12:30"
                    onChange={(event) =>
                      setBreaks((current) =>
                        current.map((entry) =>
                          entry.staffId === person.id
                            ? { ...entry, start: event.target.value }
                            : entry,
                        ),
                      )
                    }
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100"
                  />
                  <input
                    value={item?.end ?? ""}
                    placeholder="13:30"
                    onChange={(event) =>
                      setBreaks((current) =>
                        current.map((entry) =>
                          entry.staffId === person.id
                            ? { ...entry, end: event.target.value }
                            : entry,
                        ),
                      )
                    }
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100"
                  />
                </div>
              );
            })}
          </div>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar horários"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function isCurrentSlot(date: Date, slotMinutes: number) {
  const now = new Date();

  if (date.toDateString() !== now.toDateString()) {
    return false;
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= slotMinutes && nowMinutes < slotMinutes + 30;
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
            Novo horário
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
            className="w-full rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50"
          >
            {submitting ? "Salvando..." : "Confirmar horário"}
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
