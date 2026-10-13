export type TenantTheme = {
  primaryColor: string;
  primaryColorStrong: string;
  logoUrl: string;
  tagline: string;
};

export type TenantVertical = "BARBER" | "BEAUTY" | "NAILS" | "CLINIC";

export type BusinessType =
  | "BARBER_SHOP"
  | "HAIR_SALON"
  | "AESTHETICS_CLINIC"
  | "NAIL_STUDIO"
  | "TATTOO_STUDIO";

export type TenantLifecycleStatus =
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "PAST_DUE";

export type TenantVerticalSettings = {
  requiresAnamnesis: boolean;
  requiresMedicalRecord: boolean;
  sterilizationControl: boolean;
  allowWalkIn: boolean;
  bufferTimeMinutes: number;
  features: {
    membershipClub: boolean;
    inventory: boolean;
    financial: boolean;
  };
};

export type TenantSubscriptionPlan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billingInterval?: "MONTHLY";
  intervalDays: number;
  creditsPerCycle: number;
  maxUsesPerMonth?: number;
  includedServices: Array<{
    serviceId?: string;
    label: string;
    quantityPerCycle: number;
  }>;
  servicesIncluded?: Array<{
    serviceId?: string;
    label: string;
    quantityPerCycle: number;
  }>;
  isActive: boolean;
};

export type TenantAddress = {
  zipCode: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  formatted: string;
};

export type TenantPublicService = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMin: number;
};

export type TenantPublicProfessional = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: string;
};

export type TenantWorkingHour = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  lunchStart: string | null;
  lunchEnd: string | null;
};

export type TenantConfig = {
  id: string;
  slug: string;
  name: string;
  whatsappNumber: string;
  vertical: TenantVertical;
  businessType?: BusinessType;
  status?: TenantLifecycleStatus;
  settings: TenantVerticalSettings;
  subscriptionPlans: TenantSubscriptionPlan[];
  theme: TenantTheme;
  address?: TenantAddress | null;
  services?: TenantPublicService[];
  professionals?: TenantPublicProfessional[];
  workingHours?: TenantWorkingHour[];
};

export const DEFAULT_TENANT_SLUG =
  process.env.NEXT_PUBLIC_TENANT_SLUG ?? "studio-barbearia";

export const DEFAULT_VERTICAL_SETTINGS: Record<
  TenantVertical,
  TenantVerticalSettings
> = {
  BARBER: {
    requiresAnamnesis: false,
    requiresMedicalRecord: false,
    sterilizationControl: false,
    allowWalkIn: true,
    bufferTimeMinutes: 5,
    features: {
      membershipClub: true,
      inventory: true,
      financial: true,
    },
  },
  BEAUTY: {
    requiresAnamnesis: false,
    requiresMedicalRecord: false,
    sterilizationControl: false,
    allowWalkIn: true,
    bufferTimeMinutes: 10,
    features: {
      membershipClub: true,
      inventory: true,
      financial: true,
    },
  },
  NAILS: {
    requiresAnamnesis: false,
    requiresMedicalRecord: false,
    sterilizationControl: true,
    allowWalkIn: true,
    bufferTimeMinutes: 10,
    features: {
      membershipClub: true,
      inventory: true,
      financial: true,
    },
  },
  CLINIC: {
    requiresAnamnesis: true,
    requiresMedicalRecord: true,
    sterilizationControl: true,
    allowWalkIn: false,
    bufferTimeMinutes: 15,
    features: {
      membershipClub: true,
      inventory: true,
      financial: true,
    },
  },
};

export const FALLBACK_TENANT: TenantConfig = {
  id: "local",
  slug: "studio-barbearia",
  name: "Studio Barbearia",
  whatsappNumber: "5511900000000",
  vertical: "BARBER",
  businessType: "BARBER_SHOP",
  status: "ACTIVE",
  settings: DEFAULT_VERTICAL_SETTINGS.BARBER,
  subscriptionPlans: [],
  address: {
    zipCode: "01310100",
    street: "Av. Paulista",
    number: "1000",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
    formatted: "Av. Paulista, nº 1000, Bela Vista · São Paulo - SP · 01310100",
  },
  services: [],
  professionals: [],
  workingHours: [],
  theme: {
    primaryColor: "#fbbf24",
    primaryColorStrong: "#f59e0b",
    logoUrl: "/icons/icon.svg",
    tagline: "Corte, barba e estilo com agendamento rápido.",
  },
};

export function tenantThemeStyles(
  theme: TenantTheme,
): Record<string, string> {
  return {
    "--accent": theme.primaryColor,
    "--accent-strong": theme.primaryColorStrong,
  };
}
