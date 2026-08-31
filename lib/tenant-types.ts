export type TenantTheme = {
  primaryColor: string;
  primaryColorStrong: string;
  logoUrl: string;
  tagline: string;
};

export type TenantConfig = {
  id: string;
  slug: string;
  name: string;
  whatsappNumber: string;
  theme: TenantTheme;
};

export const DEFAULT_TENANT_SLUG =
  process.env.NEXT_PUBLIC_TENANT_SLUG ?? "studio-barbearia";

export const FALLBACK_TENANT: TenantConfig = {
  id: "local",
  slug: "studio-barbearia",
  name: "Studio Barbearia",
  whatsappNumber: "5511900000000",
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
