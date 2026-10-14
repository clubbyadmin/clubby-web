export type ScheduleStatus =
  | "CONFIRMED"
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type ScheduleAppointment = {
  id: string;
  staffId: string;
  staffName: string;
  customerName: string;
  serviceName: string;
  dateKey: string;
  startMinutes: number;
  durationMinutes: number;
  status: ScheduleStatus;
  insight?: {
    lastService: string | null;
    usualProfessional: string | null;
    planRemaining: number | null;
    missedLast: boolean;
  } | null;
};

export const SCHEDULE_START_HOUR = 8;
export const SCHEDULE_END_HOUR = 20;
export const SCHEDULE_INTERVAL_MINUTES = 30;

export const statusLabels: Record<ScheduleStatus, string> = {
  CONFIRMED: "Marcado",
  PENDING: "Pendente",
  IN_PROGRESS: "Na cadeira",
  COMPLETED: "Saiu",
  CANCELLED: "Cancelado",
};

export const statusStyles: Record<ScheduleStatus, string> = {
  CONFIRMED:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 ring-emerald-500/20",
  IN_PROGRESS:
    "border-amber-400/40 bg-amber-400/15 text-amber-200 ring-amber-400/30",
  PENDING:
    "border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] ring-[color-mix(in_srgb,var(--accent)_20%,transparent)]",
  COMPLETED: "border-zinc-600/40 bg-zinc-800/80 text-zinc-300 ring-zinc-600/30",
  CANCELLED: "border-red-500/30 bg-red-500/10 text-red-300 ring-red-500/20",
};

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

export function minutesToLabel(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function labelToMinutes(label: string): number {
  const [hours, minutes] = label.split(":").map(Number);
  return hours * 60 + minutes;
}

export function generateTimeSlots(
  startHour = SCHEDULE_START_HOUR,
  endHour = SCHEDULE_END_HOUR,
  interval = SCHEDULE_INTERVAL_MINUTES,
): number[] {
  const slots: number[] = [];
  const start = startHour * 60;
  const end = endHour * 60;

  for (let minutes = start; minutes < end; minutes += interval) {
    slots.push(minutes);
  }

  return slots;
}

export function createInitialAppointments(
  dateKey: string,
  staff: { id: string; name: string }[],
): ScheduleAppointment[] {
  const byName = (name: string) => staff.find((member) => member.name === name);

  const carlos = byName("Carlos Mendes");
  const rafael = byName("Rafael Souza");
  const lucas = byName("Lucas Almeida");
  const ana = staff.find((member) => member.name.includes("Ana")) ?? {
    id: "staff-ana",
    name: "Ana Manicure",
  };

  const entries: Omit<ScheduleAppointment, "id" | "dateKey">[] = [
    {
      staffId: carlos?.id ?? "carlos",
      staffName: carlos?.name ?? "Carlos Mendes",
      customerName: "Jeorgens Silva",
      serviceName: "Combo Completo",
      startMinutes: labelToMinutes("09:00"),
      durationMinutes: 50,
      status: "CONFIRMED",
    },
    {
      staffId: rafael?.id ?? "rafael",
      staffName: rafael?.name ?? "Rafael Souza",
      customerName: "Marcos Oliveira",
      serviceName: "Barba",
      startMinutes: labelToMinutes("10:00"),
      durationMinutes: 20,
      status: "PENDING",
    },
    {
      staffId: lucas?.id ?? "lucas",
      staffName: lucas?.name ?? "Lucas Almeida",
      customerName: "Pedro Henrique",
      serviceName: "Corte Cabelo",
      startMinutes: labelToMinutes("11:00"),
      durationMinutes: 30,
      status: "CONFIRMED",
    },
    {
      staffId: ana.id,
      staffName: ana.name,
      customerName: "Camila Rocha",
      serviceName: "Manicure",
      startMinutes: labelToMinutes("14:00"),
      durationMinutes: 60,
      status: "CONFIRMED",
    },
    {
      staffId: carlos?.id ?? "carlos",
      staffName: carlos?.name ?? "Carlos Mendes",
      customerName: "André Costa",
      serviceName: "Corte Cabelo",
      startMinutes: labelToMinutes("15:30"),
      durationMinutes: 30,
      status: "COMPLETED",
    },
  ];

  return entries.map((entry, index) => ({
    ...entry,
    id: `apt-${dateKey}-${index}`,
    dateKey,
  }));
}

export function appointmentCoversSlot(
  appointment: ScheduleAppointment,
  slotMinutes: number,
): boolean {
  return (
    slotMinutes >= appointment.startMinutes &&
    slotMinutes <
      appointment.startMinutes + appointment.durationMinutes
  );
}

export function appointmentStartsAtSlot(
  appointment: ScheduleAppointment,
  slotMinutes: number,
): boolean {
  return appointment.startMinutes === slotMinutes;
}

export function slotSpan(durationMinutes: number): number {
  return Math.max(1, Math.ceil(durationMinutes / SCHEDULE_INTERVAL_MINUTES));
}
