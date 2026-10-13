import type { LucideIcon } from "lucide-react";
import {
  Hand,
  HeartPulse,
  PenTool,
  Scissors,
  Sparkles,
} from "lucide-react";
import type { TenantVertical } from "@/lib/tenant-types";

export type BusinessType =
  | "BARBER_SHOP"
  | "HAIR_SALON"
  | "AESTHETICS_CLINIC"
  | "NAIL_STUDIO"
  | "TATTOO_STUDIO";

export type TenantStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "PAST_DUE";

export const BUSINESS_TYPES: Array<{
  id: BusinessType;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}> = [
  {
    id: "BARBER_SHOP",
    label: "Barbearia",
    shortLabel: "Barbearia",
    description: "Cortes, barba e experiência masculina.",
    icon: Scissors,
    accent: "#fbbf24",
  },
  {
    id: "HAIR_SALON",
    label: "Salão de Cabeleireiro",
    shortLabel: "Salão",
    description: "Cabelo, coloração e beleza.",
    icon: Sparkles,
    accent: "#fb7185",
  },
  {
    id: "AESTHETICS_CLINIC",
    label: "Clínica de Estética",
    shortLabel: "Estética",
    description: "Procedimentos, anamnese e acompanhamento.",
    icon: HeartPulse,
    accent: "#2dd4bf",
  },
  {
    id: "NAIL_STUDIO",
    label: "Estúdio de Unhas",
    shortLabel: "Unhas",
    description: "Manicure, nail design e esterilização.",
    icon: Hand,
    accent: "#e879f9",
  },
  {
    id: "TATTOO_STUDIO",
    label: "Estúdio de Tatuagem",
    shortLabel: "Tattoo",
    description: "Sessões, ficha e cuidado pós-tatuagem.",
    icon: PenTool,
    accent: "#a78bfa",
  },
];

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  BARBER_SHOP: "Barbearia",
  HAIR_SALON: "Salão de Cabeleireiro",
  AESTHETICS_CLINIC: "Clínica de Estética",
  NAIL_STUDIO: "Estúdio de Unhas",
  TATTOO_STUDIO: "Estúdio de Tatuagem",
};

export const TENANT_STATUS_LABELS: Record<TenantStatus, string> = {
  PENDING: "Pendente",
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  PAST_DUE: "Inadimplente",
};

export const BUSINESS_TYPE_TO_VERTICAL: Record<BusinessType, TenantVertical> = {
  BARBER_SHOP: "BARBER",
  HAIR_SALON: "BEAUTY",
  AESTHETICS_CLINIC: "CLINIC",
  NAIL_STUDIO: "NAILS",
  TATTOO_STUDIO: "NAILS",
};

export function businessTypeLabel(type: BusinessType | null | undefined) {
  if (!type) {
    return "Estabelecimento";
  }

  return BUSINESS_TYPE_LABELS[type] ?? type;
}

export function slugFromName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
