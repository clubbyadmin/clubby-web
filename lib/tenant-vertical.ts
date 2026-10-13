import type {
  TenantConfig,
  TenantSubscriptionPlan,
  TenantVertical,
} from "@/lib/tenant-types";

export const VERTICAL_LABELS: Record<TenantVertical, string> = {
  BARBER: "Barbearia",
  BEAUTY: "Salão de beleza",
  NAILS: "Nails designer",
  CLINIC: "Clínica de estética",
};

export function tenantVerticalLabel(vertical: TenantVertical) {
  return VERTICAL_LABELS[vertical];
}

export function tenantRequiresAnamnesis(tenant: TenantConfig) {
  return tenant.settings.requiresAnamnesis;
}

export function tenantRequiresMedicalRecord(tenant: TenantConfig) {
  return tenant.settings.requiresMedicalRecord;
}

export function tenantRequiresSterilizationControl(tenant: TenantConfig) {
  return tenant.settings.sterilizationControl;
}

export function tenantAllowsWalkIn(tenant: TenantConfig) {
  return tenant.settings.allowWalkIn;
}

export function tenantActiveSubscriptionPlans(
  tenant: TenantConfig,
): TenantSubscriptionPlan[] {
  return tenant.subscriptionPlans.filter((plan) => plan.isActive);
}
