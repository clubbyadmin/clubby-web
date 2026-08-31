export type Service = {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
};

export type Professional = {
  id: string;
  name: string;
  role: string;
  rating: number;
};

export type TimeSlot = {
  id: string;
  label: string;
  available: boolean;
};

export type AppointmentStatus = "CONFIRMED" | "PENDING" | "COMPLETED" | "CANCELLED";

export type UpcomingAppointment = {
  id: string;
  service: string;
  professional: string;
  date: string;
  time: string;
  status: AppointmentStatus;
};

export type PastAppointment = {
  id: string;
  service: string;
  professional: string;
  date: string;
  price: number;
};

export type ClientProfile = {
  name: string;
  phone: string;
  email: string;
  memberSince: string;
  totalVisits: number;
};

export const services: Service[] = [
  {
    id: "corte",
    name: "Corte Cabelo",
    description: "Corte moderno com acabamento premium.",
    price: 45,
    durationMinutes: 30,
  },
  {
    id: "barba",
    name: "Barba",
    description: "Barba completa com toalha quente.",
    price: 35,
    durationMinutes: 20,
  },
  {
    id: "combo",
    name: "Combo Completo",
    description: "Corte + barba + finalização.",
    price: 70,
    durationMinutes: 50,
  },
];

export const professionals: Professional[] = [
  {
    id: "carlos",
    name: "Carlos Mendes",
    role: "Barbeiro Master",
    rating: 4.9,
  },
  {
    id: "rafael",
    name: "Rafael Souza",
    role: "Especialista em Barba",
    rating: 4.8,
  },
  {
    id: "lucas",
    name: "Lucas Almeida",
    role: "Barbeiro Sênior",
    rating: 4.7,
  },
];

export const timeSlots: TimeSlot[] = [
  { id: "09:00", label: "09:00", available: true },
  { id: "09:30", label: "09:30", available: false },
  { id: "10:00", label: "10:00", available: true },
  { id: "10:30", label: "10:30", available: true },
  { id: "11:00", label: "11:00", available: false },
  { id: "11:30", label: "11:30", available: true },
  { id: "14:00", label: "14:00", available: true },
  { id: "14:30", label: "14:30", available: true },
  { id: "15:00", label: "15:00", available: false },
  { id: "15:30", label: "15:30", available: true },
  { id: "16:00", label: "16:00", available: true },
  { id: "16:30", label: "16:30", available: true },
];

export const clientProfile: ClientProfile = {
  name: "Jeorgens Silva",
  phone: "(11) 90000-0000",
  email: "jeorgens@studiobarbearia.com",
  memberSince: "Março 2025",
  totalVisits: 12,
};

export const upcomingAppointments: UpcomingAppointment[] = [
  {
    id: "apt-1",
    service: "Combo Completo",
    professional: "Carlos Mendes",
    date: "05 Set 2026",
    time: "15:30",
    status: "CONFIRMED",
  },
  {
    id: "apt-2",
    service: "Barba",
    professional: "Rafael Souza",
    date: "18 Set 2026",
    time: "10:00",
    status: "PENDING",
  },
];

export const pastAppointments: PastAppointment[] = [
  {
    id: "past-1",
    service: "Corte Cabelo",
    professional: "Lucas Almeida",
    date: "12 Ago 2026",
    price: 45,
  },
  {
    id: "past-2",
    service: "Combo Completo",
    professional: "Carlos Mendes",
    date: "28 Jul 2026",
    price: 70,
  },
  {
    id: "past-3",
    service: "Barba",
    professional: "Rafael Souza",
    date: "10 Jul 2026",
    price: 35,
  },
];

export function getAvailableDates(days = 7): Date[] {
  const dates: Date[] = [];
  const today = new Date();

  for (let index = 0; index < days; index += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    dates.push(date);
  }

  return dates;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}
