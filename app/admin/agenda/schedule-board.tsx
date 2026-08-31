"use client";

import { LoadingState } from "@/components/api-state";
import { AdminNav } from "@/components/admin-nav";
import { AccentIconWrap } from "@/components/app-shell";
import { TenantBadge } from "@/components/tenant-brand";
import { useTenant } from "@/contexts/tenant-context";
import { cn } from "@/lib/cn";
import {
  appointmentCoversSlot,
  appointmentStartsAtSlot,
  createInitialAppointments,
  formatDateKey,
  formatDisplayDate,
  generateTimeSlots,
  minutesToLabel,
  slotSpan,
  statusLabels,
  statusStyles,
  type ScheduleAppointment,
} from "@/lib/schedule-data";
import { api, getErrorMessage } from "@/services/api";
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
import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

type StaffMember = {
  id: string;
  name: string;
};

const EXTRA_STAFF: StaffMember[] = [
  { id: "staff-ana", name: "Ana Manicure" },
];

const SERVICE_OPTIONS = [
  "Corte Cabelo",
  "Barba",
  "Combo Completo",
  "Manicure",
];

export function ScheduleBoard() {
  const { tenant } = useTenant();
  const tenantId = tenant.id === "local" ? undefined : tenant.id;
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [appointmentsByDate, setAppointmentsByDate] = useState<
    Record<string, ScheduleAppointment[]>
  >({});
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [walkInForm, setWalkInForm] = useState({
    customerName: "",
    serviceName: SERVICE_OPTIONS[0],
    staffId: "",
    startTime: "09:00",
  });

  const dateKey = formatDateKey(selectedDate);
  const timeSlots = useMemo(() => generateTimeSlots(), []);

  const loadStaff = useCallback(async () => {
    setLoadingStaff(true);
    setStaffError(null);

    try {
      const response = await api.getUsers({ role: "STAFF", tenantId });
      const mapped = response.map((user) => ({ id: user.id, name: user.name }));
      const merged = [...mapped];

      EXTRA_STAFF.forEach((extra) => {
        if (!merged.some((member) => member.name === extra.name)) {
          merged.push(extra);
        }
      });

      setStaff(merged);
      setWalkInForm((current) => ({
        ...current,
        staffId: current.staffId || merged[0]?.id || "",
      }));
    } catch (requestError) {
      setStaffError(getErrorMessage(requestError));
      setStaff(EXTRA_STAFF);
    } finally {
      setLoadingStaff(false);
    }
  }, [tenantId]);

  useEffect(() => {
    let cancelled = false;

    api
      .getUsers({ role: "STAFF", tenantId })
      .then((response) => {
        if (cancelled) {
          return;
        }

        const mapped = response.map((user) => ({ id: user.id, name: user.name }));
        const merged = [...mapped];

        EXTRA_STAFF.forEach((extra) => {
          if (!merged.some((member) => member.name === extra.name)) {
            merged.push(extra);
          }
        });

        setStaff(merged);
        setWalkInForm((current) => ({
          ...current,
          staffId: current.staffId || merged[0]?.id || "",
        }));
        setLoadingStaff(false);
      })
      .catch((requestError: unknown) => {
        if (cancelled) {
          return;
        }

        setStaffError(getErrorMessage(requestError));
        setStaff(EXTRA_STAFF);
        setLoadingStaff(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const staffList = staff.length > 0 ? staff : EXTRA_STAFF;

  const seededDayAppointments = useMemo(
    () => createInitialAppointments(dateKey, staffList),
    [dateKey, staffList],
  );

  const dayAppointments = appointmentsByDate[dateKey] ?? seededDayAppointments;

  const visibleStaff = useMemo(() => {
    if (selectedStaffId === "all") {
      return staff.length > 0 ? staff : EXTRA_STAFF;
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

  function getSeededDay(
    current: Record<string, ScheduleAppointment[]>,
  ): ScheduleAppointment[] {
    return current[dateKey] ?? seededDayAppointments;
  }

  function shiftDate(days: number) {
    setSelectedDate((current) => {
      const next = new Date(current);
      next.setDate(current.getDate() + days);
      return next;
    });
  }

  function updateAppointment(
    appointmentId: string,
    updater: (appointment: ScheduleAppointment) => ScheduleAppointment,
  ) {
    setAppointmentsByDate((current) => {
      const dayList = getSeededDay(current);

      return {
        ...current,
        [dateKey]: dayList.map((appointment) =>
          appointment.id === appointmentId
            ? updater(appointment)
            : appointment,
        ),
      };
    });
    setActiveMenuId(null);
  }

  function handleComplete(appointmentId: string) {
    updateAppointment(appointmentId, (appointment) => ({
      ...appointment,
      status: "COMPLETED",
    }));
  }

  function handleCancel(appointmentId: string) {
    updateAppointment(appointmentId, (appointment) => ({
      ...appointment,
      status: "CANCELLED",
    }));
  }

  function handleReschedule(appointmentId: string, newStartTime: string) {
    const [hours, minutes] = newStartTime.split(":").map(Number);

    updateAppointment(appointmentId, (appointment) => ({
      ...appointment,
      startMinutes: hours * 60 + minutes,
      status: appointment.status === "PENDING" ? "CONFIRMED" : appointment.status,
    }));
    setRescheduleId(null);
  }

  function handleWalkInSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const selectedStaffMember =
      staff.find((member) => member.id === walkInForm.staffId) ??
      EXTRA_STAFF[0];
    const [hours, minutes] = walkInForm.startTime.split(":").map(Number);

    const newAppointment: ScheduleAppointment = {
      id: `walkin-${Date.now()}`,
      staffId: selectedStaffMember.id,
      staffName: selectedStaffMember.name,
      customerName: walkInForm.customerName.trim() || "Cliente Walk-in",
      serviceName: walkInForm.serviceName,
      dateKey,
      startMinutes: hours * 60 + minutes,
      durationMinutes: 30,
      status: "CONFIRMED",
    };

    setAppointmentsByDate((current) => {
      const dayList = getSeededDay(current);

      return {
        ...current,
        [dateKey]: [...dayList, newAppointment],
      };
    });

    setWalkInOpen(false);
    setWalkInForm({
      customerName: "",
      serviceName: SERVICE_OPTIONS[0],
      staffId: staff[0]?.id ?? EXTRA_STAFF[0].id,
      startTime: "09:00",
    });
  }

  if (loadingStaff && staff.length === 0) {
    return (
      <div className="px-4 pb-4 pt-6 md:px-6">
        <LoadingState message="Carregando profissionais..." />
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col px-4 pb-4 pt-6 md:px-6">
      <header className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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

      <AdminNav />

      {staffError ? (
        <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {staffError} Exibindo equipe demo local.
          <button
            type="button"
            onClick={() => void loadStaff()}
            className="ml-2 underline"
          >
            Tentar novamente
          </button>
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

        <label className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
          <span className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">
            Profissional
          </span>
          <select
            value={selectedStaffId}
            onChange={(event) => setSelectedStaffId(event.target.value)}
            className="w-full bg-transparent text-sm font-medium text-zinc-100 outline-none"
          >
            <option value="all">Visão geral da equipe</option>
            {(staff.length > 0 ? staff : EXTRA_STAFF).map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
        <div className="overflow-x-auto">
          <div
            className="grid min-w-[720px]"
            style={{
              gridTemplateColumns: `88px repeat(${visibleStaff.length}, minmax(180px, 1fr))`,
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
                  <span className="text-sm font-semibold text-zinc-100">
                    {member.name}
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
                            handleComplete(startingAppointment.id)
                          }
                          onCancel={() =>
                            handleCancel(startingAppointment.id)
                          }
                          onStartReschedule={() =>
                            setRescheduleId(startingAppointment.id)
                          }
                          onReschedule={(time) =>
                            handleReschedule(startingAppointment.id, time)
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
      </section>

      <p className="mt-4 text-xs text-zinc-500">
        Dados de agenda em modo operacional local. Integração com{" "}
        <Link href="/admin" className="text-[var(--accent)] underline">
          appointments
        </Link>{" "}
        da API em breve.
      </p>

      {walkInOpen ? (
        <WalkInModal
          form={walkInForm}
          staff={staff.length > 0 ? staff : EXTRA_STAFF}
          timeSlots={timeSlots}
          onClose={() => setWalkInOpen(false)}
          onChange={setWalkInForm}
          onSubmit={handleWalkInSubmit}
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
    customerName: string;
    serviceName: string;
    staffId: string;
    startTime: string;
  };
  staff: StaffMember[];
  timeSlots: number[];
  onClose: () => void;
  onChange: React.Dispatch<
    React.SetStateAction<WalkInModalProps["form"]>
  >;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

function WalkInModal({
  form,
  staff,
  timeSlots,
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
            <input
              value={form.customerName}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  customerName: event.target.value,
                }))
              }
              placeholder="Nome do cliente"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none"
            />
          </Field>

          <Field label="Serviço">
            <select
              value={form.serviceName}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  serviceName: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none"
            >
              {SERVICE_OPTIONS.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Profissional">
              <select
                value={form.staffId}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    staffId: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none"
              >
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
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
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none"
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
            className="w-full rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950"
          >
            Confirmar encaixe
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
