import {
  readStoredAccessToken,
  writeStoredAccessToken,
} from "@/lib/admin-session-storage";
import type {
  BusinessType,
  TenantConfig,
  TenantLifecycleStatus,
  TenantSubscriptionPlan,
  TenantVertical,
  TenantVerticalSettings,
} from "@/lib/tenant-types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type ApiUserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "RECEPTIONIST"
  | "PROFESSIONAL"
  | "CUSTOMER";

export type ApiAccessStatus = "ACTIVE" | "PENDING";

export type ApiUser = {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string;
  role: ApiUserRole;
  commissionRate: string | number;
  asaasWalletId?: string | null;
  birthDate?: string | null;
  accessStatus?: ApiAccessStatus;
  createdAt: string;
  updatedAt: string;
};

export type ApiStaffRole = Extract<
  ApiUserRole,
  "ADMIN" | "RECEPTIONIST" | "PROFESSIONAL"
>;

export type ApiService = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  price: string | number;
  durationMin: number;
  isActive: boolean;
  createdAt: string;
};

export type ApiTenant = TenantConfig;
export type ApiSubscriptionPlan = TenantSubscriptionPlan & {
  tenantId?: string;
};
export type ApiTenantVertical = TenantVertical;
export type ApiTenantSettings = TenantVerticalSettings;
export type ApiBusinessType = BusinessType;
export type ApiTenantStatus = TenantLifecycleStatus;

export type ApiPlatformTenant = {
  id: string;
  slug: string;
  name: string;
  document: string;
  whatsappNumber: string;
  businessType: BusinessType;
  vertical: TenantVertical;
  status: TenantLifecycleStatus;
  platformFee: number;
  parentId: string | null;
  isHeadquarters: boolean;
  zipCode: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  createdAt: string;
  owner: {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    role: ApiUserRole;
  } | null;
  counts?: {
    users: number;
    appointments: number;
    clubMembers: number;
    branches: number;
  };
};

export type ApiTestSeedLogin = {
  role: ApiUserRole;
  name: string;
  phone: string;
  email: string;
};

export type ApiTestSeedResult = {
  reused: boolean;
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
  password: string;
  logins: {
    admin: ApiTestSeedLogin;
    receptionist: ApiTestSeedLogin;
    professional: ApiTestSeedLogin;
  };
  counts: {
    staff: number;
    clients: number;
    services: number;
    appointments: number;
    waitlist: number;
  };
  links: {
    shop: string;
    barber: string;
    reception: string;
    superAdmin: string;
  };
};

export type RegisterTenantPayload = {
  name: string;
  slug: string;
  document: string;
  whatsappNumber: string;
  businessType: BusinessType;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerPassword: string;
  zipCode?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
};

export type SuperAdminCreateTenantPayload = Partial<RegisterTenantPayload> & {
  tenantId?: string;
  platformFee?: number;
};

export type ApiPlatformMetrics = {
  generatedAt: string;
  tenants: {
    total: number;
    PENDING: number;
    ACTIVE: number;
    SUSPENDED: number;
    PAST_DUE: number;
    byBusinessType: Record<BusinessType, number>;
  };
  platformRevenue: {
    currency: "BRL";
    billedTenants: number;
    mrr: number;
    arr: number;
    averageFee: number;
  };
  operations: {
    appointmentsLast30Days: number;
    completedAppointmentsLast30Days: number;
    activeClubMemberships: number;
    staffCount: number;
  };
  conversionRate?: number;
};

export type ApiWhatsappHealth =
  | "HEALTHY"
  | "DEGRADED"
  | "DISCONNECTED"
  | "ERROR"
  | "NOT_CONFIGURED";

export type ApiWhatsappNetworkStatus = {
  generatedAt: string;
  summary: Record<ApiWhatsappHealth, number> & { total: number };
  tenants: Array<{
    tenantId: string;
    name: string;
    slug: string;
    tenantStatus: TenantLifecycleStatus;
    whatsappNumber: string;
    configured: boolean;
    provider: string | null;
    instanceName: string | null;
    isActive: boolean;
    lastTestAt: string | null;
    lastError: string | null;
    phoneNumber: string | null;
    failedLast24h: number;
    health: ApiWhatsappHealth;
  }>;
};

export type ApiFinancialMetrics = {
  generatedAt: string;
  periodDays: number;
  tenants: {
    total: number;
    PENDING: number;
    ACTIVE: number;
    SUSPENDED: number;
    PAST_DUE: number;
  };
  platform: {
    currency: "BRL";
    mrr: number;
    arr: number;
    pastDueMrr: number;
    billedTenants: number;
    pastDueTenants: number;
    collectionRate: number;
  };
  network: {
    transactionVolume: number;
    transactionCount: number;
    appointmentsLast30Days: number;
    completedAppointmentsLast30Days: number;
    conversionRate: number;
  };
};

export type ApiResetTenantPasswordResult = {
  tenantId: string;
  tenantName: string;
  slug: string;
  admin: {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    role: ApiUserRole;
  };
  temporaryPassword: string;
  message: string;
};

export type ApiSubscriptionStatus =
  | "ACTIVE"
  | "OVERDUE"
  | "CANCELLED"
  | "EXPIRED";

export type ApiClubStatus = "ACTIVE" | "PAST_DUE" | "CANCELED";

export type ApiPaymentStatus =
  | "CURRENT"
  | "OVERDUE"
  | "CANCELLED"
  | "EXPIRED";

export type ApiIncludedService = {
  serviceId?: string;
  label: string;
  quantityPerCycle: number;
};

export type ApiSubscriptionMember = {
  id: string;
  tenantId: string;
  clientId: string;
  customerId: string;
  planId: string;
  status: ApiSubscriptionStatus;
  clubStatus: ApiClubStatus;
  paymentStatus: ApiPaymentStatus;
  creditsRemaining: number;
  usesRemaining: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  renewalDate: string;
  createdAt: string;
  plan: ApiSubscriptionPlan;
  client: {
    id: string;
    name: string;
    phone: string;
  };
  customer: {
    id: string;
    name: string;
    phone: string;
  };
};

export type ApiTenantClubSummary = {
  activeMembers: number;
  pastDueMembers: number;
  canceledMembers: number;
  mrr: number;
  overdueAmount: number;
  recurringRevenue: number;
};

export type ApiTenantClub = {
  tenantId: string;
  generatedAt: string;
  billingInterval: "MONTHLY";
  summary: ApiTenantClubSummary;
  members: ApiSubscriptionMember[];
};

export type CreateSubscriptionPlanPayload = {
  tenantId: string;
  name: string;
  description?: string;
  price: number;
  billingInterval?: "MONTHLY";
  intervalDays?: number;
  creditsPerCycle?: number;
  maxUsesPerMonth?: number;
  includedServices?: ApiIncludedService[];
  servicesIncluded?: ApiIncludedService[];
  isActive?: boolean;
};

export type ApiAppointmentStatus =
  | "PENDING"
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type ApiOpeningHours = {
  days: Array<{
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    lunchStart: string | null;
    lunchEnd: string | null;
  }>;
  breaks: Array<{ staffId: string; start: string; end: string }>;
};

export type ApiAppointment = {
  id: string;
  tenantId: string;
  status: ApiAppointmentStatus;
  startTime: string;
  endTime: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  };
  staff: {
    id: string;
    name: string;
    phone: string;
    role: ApiUserRole;
    commissionRate?: string | number | null;
  };
  services: Array<{
    service: {
      id: string;
      name: string;
      durationMin: number;
      price: string | number;
    };
  }>;
  totalAmount?: string | number;
  clientInsight?: {
    lastService: string | null;
    usualProfessional: string | null;
    planRemaining: number | null;
    missedLast: boolean;
  } | null;
};

export type CreateAppointmentPayload = {
  tenantId: string;
  clientId: string;
  professionalId: string;
  serviceId: string;
  startTime: string;
  status?: ApiAppointmentStatus;
};

export type UpdateAppointmentPayload = {
  status?: ApiAppointmentStatus;
  startTime?: string;
};

export type ApiWaitlistStatus =
  | "WAITING"
  | "NOTIFIED"
  | "CONVERTED"
  | "EXPIRED";

export type ApiWaitlistEntry = {
  id: string;
  tenantId: string;
  clientId: string;
  preferredProfessionalId: string | null;
  serviceId: string;
  targetDate: string;
  targetTimeSlot: string;
  status: ApiWaitlistStatus;
  convertedAppointmentId: string | null;
  createdAt: string;
  acceptsAnyProfessional: boolean;
  client: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  };
  preferredProfessional: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  service: {
    id: string;
    name: string;
    durationMin: number;
    price: number;
  };
  convertedAppointment: {
    id: string;
    startTime: string;
    staffId: string;
    status: ApiAppointmentStatus;
  } | null;
};

export type CreateWaitlistPayload = {
  tenantId: string;
  clientId: string;
  preferredProfessionalId?: string | null;
  serviceId: string;
  targetDate: string;
  targetTimeSlot: string;
};

export type ApiEmptyChairFill = {
  filled: boolean;
  reason?:
    | "OUTSIDE_WINDOW"
    | "NO_MATCH"
    | "ALREADY_FILLED"
    | "ALREADY_CANCELLED"
    | "BOOKING_FAILED"
    | "OFFERED";
  waitlistEntry?: ApiWaitlistEntry;
  appointment?: { id: string };
};

export type ApiCancelAppointmentResponse = {
  appointment: ApiAppointment;
  emptyChair: ApiEmptyChairFill;
};

export type ApiWhatsappProvider = "MOCK" | "EVOLUTION" | "WEBHOOK";
export type ApiWhatsappMessageType =
  | "REMINDER"
  | "BIRTHDAY"
  | "WAITLIST"
  | "MARKETING"
  | "MANUAL"
  | "INBOUND";
export type ApiWhatsappMessageStatus = "SENT" | "FAILED" | "RECEIVED";
export type ApiWhatsappConnectionStatus =
  | "NOT_CONFIGURED"
  | "CONNECTED"
  | "INACTIVE"
  | "ERROR";

export type ApiWhatsappAutomations = {
  confirmationEnabled: boolean;
  reminderEnabled: boolean;
  reminderHoursBefore: number;
  birthdayEnabled: boolean;
  waitlistEnabled: boolean;
  marketingEnabled: boolean;
  templates: {
    confirmation: string;
    reminder: string;
    birthday: string;
    waitlist: string;
  };
};

export type ApiWhatsappConfig = {
  configured: boolean;
  status: ApiWhatsappConnectionStatus;
  tenantId: string;
  provider: ApiWhatsappProvider;
  instanceName: string | null;
  apiUrl: string | null;
  apiTokenMasked: string | null;
  phoneNumber: string | null;
  isActive: boolean;
  lastTestAt: string | null;
  lastError: string | null;
  automations: ApiWhatsappAutomations;
};

export type ApiMessageLog = {
  id: string;
  tenantId: string;
  recipientPhone: string;
  messageContent: string;
  type: ApiWhatsappMessageType;
  status: ApiWhatsappMessageStatus;
  sentAt: string;
  eventKey: string | null;
  errorMessage: string | null;
  appointmentId: string | null;
  createdAt: string;
};

export type UpsertWhatsappConfigPayload = {
  tenantId: string;
  provider?: ApiWhatsappProvider;
  instanceName?: string | null;
  apiUrl?: string | null;
  apiToken?: string | null;
  phoneNumber?: string | null;
  isActive?: boolean;
  automations?: Partial<ApiWhatsappAutomations> & {
    templates?: Partial<ApiWhatsappAutomations["templates"]>;
  };
};

export type SendWhatsappPayload = {
  tenantId: string;
  recipientPhone: string;
  messageContent: string;
  type?: ApiWhatsappMessageType;
};

export type ApiExpenseCategory =
  | "ALUGUEL"
  | "AGUA"
  | "ENERGIA"
  | "FORNECEDOR"
  | "OUTROS";

export type ApiExpenseStatus = "PENDING" | "PAID";

export type ApiExpense = {
  id: string;
  tenantId: string;
  description: string;
  category: ApiExpenseCategory;
  amount: number | string;
  dueDate: string;
  paidAt: string | null;
  status: ApiExpenseStatus;
  createdAt: string;
};

export type ApiExpenseCategoryBreakdown = {
  category: ApiExpenseCategory;
  paid: number;
  pending: number;
  total: number;
};

export type ApiFinancialSummary = {
  tenantId: string;
  from: string | null;
  to: string | null;
  totalRevenue: number;
  completedAppointments: number;
  totalPaidExpenses: number;
  paidExpensesCount: number;
  totalPendingExpenses: number;
  pendingExpensesCount: number;
  netProfit: number;
  expensesByCategory: ApiExpenseCategoryBreakdown[];
};

export type CreateExpensePayload = {
  tenantId: string;
  description: string;
  category: ApiExpenseCategory;
  amount: number;
  dueDate: string;
  status?: ApiExpenseStatus;
  paidAt?: string;
};

export type UpdateExpensePayload = {
  description?: string;
  category?: ApiExpenseCategory;
  amount?: number;
  dueDate?: string;
  status?: ApiExpenseStatus;
  paidAt?: string;
};

export type ApiCashFlowType = "INCOME" | "EXPENSE";

export type ApiTransactionCategory =
  | "SERVICE_REVENUE"
  | "SUBSCRIPTION_REVENUE"
  | "PROFESSIONAL_PAYOUT"
  | "OPERATING_EXPENSE"
  | "OTHER";

export type ApiSettlementStatus = "PENDING" | "PAID";

export type ApiTransactionPaymentMethod = "CREDIT" | "DEBIT" | "PIX" | "CASH";

export type ApiTransactionStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export type ApiCommissionStatus = "PENDING" | "PAID";

export type ApiDreProfessional = {
  professionalId: string;
  professionalName: string;
  partnerShareRate: number;
  appointmentCount: number;
  grossRevenue: number;
  salonShare: number;
  professionalShare: number;
};

export type ApiDre = {
  tenantId: string;
  from: string | null;
  to: string | null;
  legalBasis: string;
  grossRevenue: number;
  completedAppointments: number;
  salonShare: number;
  professionalShare: number;
  operatingExpenses: number;
  netProfit: number;
  byProfessional: ApiDreProfessional[];
  accountsPayable: {
    operatingExpenses: number;
    professionalSettlements: number;
    total: number;
  };
  accountsReceivable: {
    pendingAppointments: number;
    total: number;
  };
};

export type ApiCashflowEntry = {
  id: string;
  tenantId: string;
  clientId: string | null;
  professionalId: string | null;
  type: ApiCashFlowType;
  category: ApiTransactionCategory;
  description: string;
  amount: number;
  paymentMethod: ApiTransactionPaymentMethod | null;
  status: ApiTransactionStatus;
  occurredAt: string;
  appointmentId: string | null;
  expenseId: string | null;
  settlementId: string | null;
  createdAt: string;
};

export type ApiCashflow = {
  tenantId: string;
  from: string | null;
  to: string | null;
  totalIncome: number;
  totalExpense: number;
  netCash: number;
  byCategory: Array<{
    category: ApiTransactionCategory;
    type: ApiCashFlowType;
    total: number;
  }>;
  entries: ApiCashflowEntry[];
};

export type ApiSettlement = {
  id: string;
  tenantId: string;
  professionalId: string;
  professional: {
    id: string;
    name: string;
    phone: string;
  };
  periodStart: string;
  periodEnd: string;
  grossRevenue: number;
  salonShare: number;
  professionalShare: number;
  partnerShareRate: number;
  appointmentCount: number;
  status: ApiSettlementStatus;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  legalBasis: string;
};

export type CreateTransactionPayload = {
  tenantId: string;
  type: ApiCashFlowType;
  category?: ApiTransactionCategory;
  description: string;
  amount: number;
  occurredAt: string;
  clientId?: string;
  professionalId?: string;
  paymentMethod?: ApiTransactionPaymentMethod;
  status?: ApiTransactionStatus;
};

export type ApiCommissionParty = {
  id: string;
  name: string;
  phone: string;
};

export type ApiCommission = {
  id: string;
  tenantId: string;
  professionalId: string;
  appointmentId: string;
  clientId: string | null;
  grossAmount: number;
  commissionRate: number;
  salonShare: number;
  netPayout: number;
  status: ApiCommissionStatus;
  paidAt: string | null;
  settlementId: string | null;
  createdAt: string;
  legalBasis: string;
  professional: ApiCommissionParty;
  client: ApiCommissionParty | null;
  appointment: {
    id: string;
    startTime: string;
    paymentMethod: "PIX" | "CREDIT_CARD" | "IN_PERSON";
    status: string;
  };
};

export type ApiCommissionProfessional = {
  professionalId: string;
  professionalName: string;
  appointmentCount: number;
  grossAmount: number;
  salonShare: number;
  netPayout: number;
  pendingPayout: number;
  paidPayout: number;
  commissionRate: number;
};

export type ApiCommissionsOverview = {
  tenantId: string;
  from: string | null;
  to: string | null;
  legalBasis: string;
  summary: {
    appointmentCount: number;
    grossAmount: number;
    salonShare: number;
    netPayout: number;
    pendingPayout: number;
    paidPayout: number;
  };
  byProfessional: ApiCommissionProfessional[];
  items: ApiCommission[];
};

export type ApiFinancialOverviewPartner = {
  tenantId: string;
  name: string;
  slug: string;
  status: TenantLifecycleStatus;
  businessType: BusinessType;
  city: string | null;
  state: string | null;
  platformFee: number;
  grossVolume: number;
  transactionCount: number;
  salonShare: number;
  professionalPayout: number;
  pendingPayout: number;
  commissionCount: number;
};

export type ApiFinancialOverview = {
  generatedAt: string;
  from: string | null;
  to: string | null;
  legalBasis: string;
  platform: {
    currency: "BRL";
    billedTenants: number;
    mrr: number;
    arr: number;
    averageFee: number;
  };
  network: {
    grossVolume: number;
    expenses: number;
    netCash: number;
    completedAppointments: number;
    salonShare: number;
    professionalPayout: number;
    pendingPayout: number;
    commissionCount: number;
    transactionCount: number;
  };
  byPaymentMethod: Array<{
    paymentMethod: ApiTransactionPaymentMethod | null;
    total: number;
    count: number;
  }>;
  partners: ApiFinancialOverviewPartner[];
};

export type ApiCampaignType =
  | "INACTIVE_RECOVERY"
  | "BIRTHDAY"
  | "DISCOUNT_COUPON"
  | "REFERRAL";

export type ApiCampaignStatus = "DRAFT" | "ACTIVE" | "SENT";

export type ApiCampaignAudience = {
  inactiveDays?: number;
  birthMonth?: number;
  minCompletedVisits?: number;
  couponId?: string;
};

export type ApiCoupon = {
  id: string;
  tenantId: string;
  code: string;
  discountPercent: number;
  expirationDate: string;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  isExpired: boolean;
  isAvailable: boolean;
  createdAt: string;
};

export type ApiCampaign = {
  id: string;
  tenantId: string;
  title: string;
  type: ApiCampaignType;
  messageTemplate: string;
  targetAudience: ApiCampaignAudience;
  status: ApiCampaignStatus;
  couponId: string | null;
  coupon: ApiCoupon | null;
  createdAt: string;
};

export type ApiAudienceRecipient = {
  customerId: string;
  name: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  lastVisitAt: string | null;
  completedVisits: number;
  reason: "inactive" | "birthday" | "coupon" | "referral";
  message?: string;
};

export type ApiAudiencePreview = {
  type: ApiCampaignType;
  filters: {
    inactiveDays: number;
    birthMonth: number;
    minCompletedVisits: number;
    couponId: string | null;
  };
  count: number;
  recipients: ApiAudienceRecipient[];
};

export type CreateCampaignPayload = {
  tenantId: string;
  title: string;
  type: ApiCampaignType;
  messageTemplate: string;
  targetAudience?: ApiCampaignAudience;
  status?: ApiCampaignStatus;
  couponId?: string | null;
};

export type CreateCouponPayload = {
  tenantId: string;
  code: string;
  discountPercent: number;
  expirationDate: string;
  usageLimit?: number | null;
  isActive?: boolean;
};

export type ApiGoalPeriod = "WEEKLY" | "MONTHLY";
export type ApiGoalStatus = "ACTIVE" | "COMPLETED" | "MISSED" | "CANCELLED";
export type ApiGoalScope = "PROFESSIONAL" | "UNIT";

export type ApiManagementUnit = {
  id: string;
  slug: string;
  name: string;
  document: string;
  whatsappNumber: string;
  vertical: string;
  parentId: string | null;
  isHeadquarters: boolean;
  isCurrent: boolean;
  headquartersId: string;
  createdAt?: string;
};

export type ApiUnitsResponse = {
  currentTenantId: string;
  headquarters: ApiManagementUnit;
  units: ApiManagementUnit[];
};

export type ApiGoalProfessional = {
  id: string;
  name: string;
  phone: string;
  role: ApiUserRole;
};

export type ApiGoal = {
  id: string;
  tenantId: string;
  professionalId: string | null;
  professional: ApiGoalProfessional | null;
  tenant: {
    id: string;
    slug: string;
    name: string;
    parentId: string | null;
    isHeadquarters: boolean;
  };
  targetAmount: number;
  period: ApiGoalPeriod;
  startDate: string;
  endDate: string;
  status: ApiGoalStatus;
  currentAmount: number;
  appointmentCount: number;
  progressPercent: number;
  remainingAmount: number;
  achieved: boolean;
  scope: ApiGoalScope;
  createdAt: string;
  updatedAt: string;
};

export type ApiGoalsResponse = {
  tenantId: string;
  networkTenantIds: string[];
  summary: {
    goalCount: number;
    achievedCount: number;
    targetAmount: number;
    currentAmount: number;
    progressPercent: number;
  };
  goals: ApiGoal[];
};

export type CreateGoalPayload = {
  tenantId: string;
  professionalId?: string | null;
  targetAmount: number;
  period: ApiGoalPeriod;
  startDate: string;
  endDate: string;
  status?: ApiGoalStatus;
};

export type ApiReminderStatus = "PENDING" | "SENT" | "FAILED";

export type ApiClient = {
  id: string;
  tenantId: string;
  userId: string | null;
  name: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  notes: string | null;
  cpf: string | null;
  zipCode: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

export type ApiCustomerProfile = {
  user: {
    id: string;
    tenantId: string;
    name: string;
    email: string | null;
    phone: string;
    birthDate: string | null;
    createdAt: string;
  };
  client: ApiClient;
};

export type UpdateCustomerProfilePayload = {
  tenantId: string;
  userId: string;
  name?: string;
  email?: string | null;
  phone?: string;
  birthDate?: string | null;
  password?: string;
  cpf?: string | null;
  zipCode?: string | null;
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  avatarUrl?: string | null;
};

export type ApiClientHistoryItem = {
  id: string;
  source: "APPOINTMENT" | "NOTE";
  tenantId: string;
  clientId: string;
  appointmentId: string | null;
  professional: { id: string; name: string } | null;
  serviceName: string | null;
  services: Array<{ id: string; name: string; price: number }>;
  notes: string | null;
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
  status: ApiAppointmentStatus | null;
  totalAmount: number | null;
  occurredAt: string;
  createdAt: string;
};

export type ApiReminder = {
  id: string;
  tenantId: string;
  clientId: string;
  appointmentId: string | null;
  message: string;
  scheduledAt: string;
  status: ApiReminderStatus;
  sentAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  client: {
    id: string;
    name: string;
    phone: string;
  } | null;
};

export type CreateClientPayload = {
  tenantId: string;
  name: string;
  phone: string;
  email?: string | null;
  birthDate?: string | null;
  notes?: string | null;
};

export type CreateClientHistoryPayload = {
  tenantId?: string;
  appointmentId?: string | null;
  professionalId?: string | null;
  serviceName?: string | null;
  notes?: string | null;
  beforePhotoUrl?: string | null;
  afterPhotoUrl?: string | null;
  occurredAt?: string | null;
};

export type CreateReminderPayload = {
  tenantId: string;
  clientId: string;
  appointmentId?: string | null;
  message: string;
  scheduledAt: string;
  status?: ApiReminderStatus;
};

export type ApiProductCategory = "USO_INTERNO" | "REVENDA";

export type ApiStockMovementType = "IN" | "OUT" | "ADJUSTMENT" | "SERVICE_USAGE";

export type ApiProductUsage = {
  serviceId: string;
  serviceName: string;
  quantity: number;
};

export type ApiProduct = {
  id: string;
  tenantId: string;
  name: string;
  category: ApiProductCategory;
  stockQuantity: number;
  minStockAlert: number;
  unitCost: number;
  salePrice: number | null;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
  serviceUsages: ApiProductUsage[];
};

export type CreateProductPayload = {
  tenantId: string;
  name: string;
  category: ApiProductCategory;
  stockQuantity?: number;
  minStockAlert: number;
  unitCost: number;
  salePrice?: number | null;
};

export type AdjustStockPayload = {
  type: Exclude<ApiStockMovementType, "SERVICE_USAGE">;
  quantity: number;
  reason?: string;
};

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  writeStoredAccessToken(token);
}

export function getAccessToken() {
  if (accessToken) {
    return accessToken;
  }

  accessToken = readStoredAccessToken();
  return accessToken;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...init } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = "Não foi possível concluir a requisição.";

    try {
      const payload = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(payload.message)) {
        message = payload.message.join(", ");
      } else if (payload.message) {
        message = payload.message;
      }
    } catch {
      message = response.statusText || message;
    }

    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return query ? `?${query}` : "";
}

export const api = {
  login(payload: {
    tenantId?: string;
    slug?: string;
    phone?: string;
    email?: string;
    password: string;
  }) {
    return request<{
      accessToken: string;
      user: {
        id: string;
        tenantId: string;
        name: string;
        email: string | null;
        phone: string;
        role: ApiUserRole;
      };
    }>("/auth/login", {
      method: "POST",
      body: payload,
    });
  },

  startCustomerEmail(slug: string, email: string) {
    return request<{ challengeId: string; previewCode: string | null }>(
      "/auth/customer/email",
      { method: "POST", body: { slug, email } },
    );
  },

  verifyCustomerEmail(challengeId: string, code: string) {
    return request<{ pendingToken: string }>("/auth/customer/email/verify", {
      method: "POST",
      body: { challengeId, code },
    });
  },

  startCustomerProvider(provider: "google" | "apple" | "microsoft", slug: string) {
    return request<{ url: string }>(
      `/auth/customer/start${buildQuery({ provider, slug })}`,
    );
  },

  startCustomerPhone(pendingToken: string, phone: string) {
    return request<{ challengeId: string; phone: string; previewCode: string | null }>(
      "/auth/customer/phone",
      { method: "POST", body: { pendingToken, phone } },
    );
  },

  confirmCustomerPhone(challengeId: string, code: string) {
    return request<{
      accessToken: string;
      user: {
        id: string;
        tenantId: string;
        name: string;
        email: string | null;
        phone: string;
        role: "CUSTOMER";
      };
    }>("/auth/customer/phone/confirm", {
      method: "POST",
      body: { challengeId, code },
    });
  },

  seedTestEnvironment() {
    return request<ApiTestSeedResult>("/test-tools/seed", {
      method: "POST",
    });
  },

  getServices(tenantId?: string, options?: { includeInactive?: boolean }) {
    return request<ApiService[]>(
      `/services${buildQuery({
        tenantId,
        includeInactive: options?.includeInactive ? "true" : undefined,
      })}`,
    );
  },

  createService(payload: {
    name: string;
    description?: string;
    price: number;
    durationMin: number;
  }) {
    return request<ApiService>("/services", {
      method: "POST",
      body: payload,
    });
  },

  updateService(
    id: string,
    payload: {
      name?: string;
      description?: string | null;
      price?: number;
      durationMin?: number;
      isActive?: boolean;
    },
  ) {
    return request<ApiService>(`/services/${id}`, {
      method: "PATCH",
      body: payload,
    });
  },

  deactivateService(id: string) {
    return request<ApiService>(`/services/${id}`, {
      method: "DELETE",
    });
  },

  applyServiceTemplates() {
    return request<{ created: ApiService[]; skipped: number }>(
      "/services/templates/apply",
      { method: "POST" },
    );
  },

  getUsers(params?: {
    role?: ApiUserRole;
    tenantId?: string;
    staffOnly?: boolean;
  }) {
    return request<ApiUser[]>(
      `/users${buildQuery({
        role: params?.role,
        tenantId: params?.tenantId,
        staffOnly: params?.staffOnly ? "true" : undefined,
      })}`,
    );
  },

  createUser(payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: ApiStaffRole;
    tenantId?: string;
    commissionRate?: number;
    asaasWalletId?: string | null;
  }) {
    return request<ApiUser>("/users", {
      method: "POST",
      body: payload,
    });
  },

  updateUserRole(id: string, role: ApiStaffRole) {
    return request<ApiUser>(`/users/${id}/role`, {
      method: "PATCH",
      body: { role },
    });
  },

  updateUser(
    id: string,
    payload: {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
      role?: ApiStaffRole;
      commissionRate?: number;
      asaasWalletId?: string | null;
    },
  ) {
    return request<ApiUser>(`/users/${id}`, {
      method: "PATCH",
      body: payload,
    });
  },

  getUser(id: string) {
    return request<ApiUser>(`/users/${id}`);
  },

  getTenant(slug: string) {
    return request<ApiTenant>(`/tenants/slug/${encodeURIComponent(slug)}`);
  },

  registerTenant(payload: RegisterTenantPayload) {
    return request<ApiPlatformTenant>("/tenants/register", {
      method: "POST",
      body: payload,
    });
  },

  getSuperAdminTenants(params?: {
    status?: TenantLifecycleStatus;
    businessType?: BusinessType;
  }) {
    return request<ApiPlatformTenant[]>(
      `/super-admin/tenants${buildQuery({
        status: params?.status,
        businessType: params?.businessType,
      })}`,
    );
  },

  createSuperAdminTenant(payload: SuperAdminCreateTenantPayload) {
    return request<ApiPlatformTenant>("/super-admin/tenants", {
      method: "POST",
      body: payload,
    });
  },

  updateSuperAdminTenant(
    id: string,
    payload: {
      status?: TenantLifecycleStatus;
      platformFee?: number;
      businessType?: BusinessType;
      name?: string;
      document?: string;
      whatsappNumber?: string;
      zipCode?: string;
      street?: string;
      number?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
    },
  ) {
    return request<ApiPlatformTenant>(`/super-admin/tenants/${id}`, {
      method: "PATCH",
      body: payload,
    });
  },

  updateSuperAdminTenantStatus(id: string, status: TenantLifecycleStatus) {
    return request<ApiPlatformTenant>(`/super-admin/tenants/${id}/status`, {
      method: "PATCH",
      body: { status },
    });
  },

  resetSuperAdminTenantPassword(id: string, password?: string) {
    return request<ApiResetTenantPasswordResult>(
      `/super-admin/tenants/${id}/reset-password`,
      {
        method: "POST",
        body: password ? { password } : {},
      },
    );
  },

  getSuperAdminWhatsappStatus() {
    return request<ApiWhatsappNetworkStatus>("/super-admin/whatsapp-status");
  },

  getSuperAdminFinancialMetrics() {
    return request<ApiFinancialMetrics>("/super-admin/financial-metrics");
  },

  getSuperAdminMetrics() {
    return request<ApiPlatformMetrics>("/super-admin/metrics");
  },

  getSuperAdminFinancialOverview(params?: { from?: string; to?: string }) {
    return request<ApiFinancialOverview>(
      `/super-admin/financial-overview${buildQuery({
        from: params?.from,
        to: params?.to,
      })}`,
    );
  },

  getAppointments(params?: {
    tenantId?: string;
    clientId?: string;
    professionalId?: string;
    status?: ApiAppointmentStatus;
    from?: string;
    to?: string;
  }) {
    return request<ApiAppointment[]>(
      `/appointments${buildQuery({
        tenantId: params?.tenantId,
        clientId: params?.clientId,
        professionalId: params?.professionalId,
        status: params?.status,
        from: params?.from,
        to: params?.to,
      })}`,
    );
  },

  createAppointment(payload: CreateAppointmentPayload) {
    return request<ApiAppointment>("/appointments", {
      method: "POST",
      body: payload,
    });
  },

  getAvailability(params: {
    tenantId: string;
    professionalId: string;
    serviceId: string;
    date: string;
  }) {
    return request<{ slots: string[] }>(
      `/appointments/availability${buildQuery(params)}`,
    );
  },

  getOpeningHours(tenantId: string) {
    return request<ApiOpeningHours>(
      `/appointments/hours${buildQuery({ tenantId })}`,
    );
  },

  saveOpeningHours(payload: ApiOpeningHours & { tenantId: string }) {
    return request<ApiOpeningHours>("/appointments/hours", {
      method: "PUT",
      body: payload,
    });
  },

  moveAppointment(
    id: string,
    payload: { newProfessionalId: string; newStartTime: string },
  ) {
    return request<ApiAppointment>(`/appointments/${id}/move`, {
      method: "PATCH",
      body: payload,
    });
  },

  updateAppointment(id: string, payload: UpdateAppointmentPayload) {
    return request<ApiAppointment>(`/appointments/${id}`, {
      method: "PATCH",
      body: payload,
    });
  },

  cancelAppointment(id: string) {
    return request<ApiCancelAppointmentResponse>(`/appointments/${id}/cancel`, {
      method: "PATCH",
    });
  },

  getWaitlist(params: {
    tenantId: string;
    date?: string;
    status?: ApiWaitlistStatus;
  }) {
    return request<ApiWaitlistEntry[]>(
      `/waitlist${buildQuery({
        tenantId: params.tenantId,
        date: params.date,
        status: params.status,
      })}`,
    );
  },

  joinWaitlist(payload: CreateWaitlistPayload) {
    return request<ApiWaitlistEntry>("/waitlist", {
      method: "POST",
      body: payload,
    });
  },

  getExpenses(params: {
    tenantId: string;
    status?: ApiExpenseStatus;
    category?: ApiExpenseCategory;
    from?: string;
    to?: string;
  }) {
    return request<ApiExpense[]>(
      `/financial/expenses${buildQuery({
        tenantId: params.tenantId,
        status: params.status,
        category: params.category,
        from: params.from,
        to: params.to,
      })}`,
    );
  },

  getFinancialSummary(params: {
    tenantId: string;
    from?: string;
    to?: string;
  }) {
    return request<ApiFinancialSummary>(
      `/financial/summary${buildQuery({
        tenantId: params.tenantId,
        from: params.from,
        to: params.to,
      })}`,
    );
  },

  createExpense(payload: CreateExpensePayload) {
    return request<ApiExpense>("/financial/expenses", {
      method: "POST",
      body: payload,
    });
  },

  updateExpense(id: string, payload: UpdateExpensePayload) {
    return request<ApiExpense>(`/financial/expenses/${id}`, {
      method: "PATCH",
      body: payload,
    });
  },

  getDre(params: { tenantId: string; from?: string; to?: string }) {
    return request<ApiDre>(
      `/financial/dre${buildQuery({
        tenantId: params.tenantId,
        from: params.from,
        to: params.to,
      })}`,
    );
  },

  getCashflow(params: { tenantId: string; from?: string; to?: string }) {
    return request<ApiCashflow>(
      `/financial/cashflow${buildQuery({
        tenantId: params.tenantId,
        from: params.from,
        to: params.to,
      })}`,
    );
  },

  getSettlements(params: {
    tenantId: string;
    professionalId?: string;
    status?: ApiSettlementStatus;
    from?: string;
    to?: string;
  }) {
    return request<ApiSettlement[]>(
      `/financial/settlements${buildQuery({
        tenantId: params.tenantId,
        professionalId: params.professionalId,
        status: params.status,
        from: params.from,
        to: params.to,
      })}`,
    );
  },

  processSettlements(payload: {
    tenantId: string;
    from: string;
    to: string;
    professionalId?: string;
    markAsPaid?: boolean;
  }) {
    return request<{
      legalBasis: string;
      from: string;
      to: string;
      settlements: ApiSettlement[];
    }>("/financial/settlements", {
      method: "POST",
      body: payload,
    });
  },

  updateSettlement(
    id: string,
    payload: { status: ApiSettlementStatus; paidAt?: string },
  ) {
    return request<ApiSettlement>(`/financial/settlements/${id}`, {
      method: "PATCH",
      body: payload,
    });
  },

  createTransaction(payload: CreateTransactionPayload) {
    return request<ApiCashflowEntry>("/financial/transactions", {
      method: "POST",
      body: payload,
    });
  },

  getCommissions(params: {
    tenantId: string;
    professionalId?: string;
    status?: ApiCommissionStatus;
    from?: string;
    to?: string;
  }) {
    return request<ApiCommissionsOverview>(
      `/financial/commissions${buildQuery({
        tenantId: params.tenantId,
        professionalId: params.professionalId,
        status: params.status,
        from: params.from,
        to: params.to,
      })}`,
    );
  },

  updateCommission(
    id: string,
    payload: { status: ApiCommissionStatus; paidAt?: string },
  ) {
    return request<ApiCommission>(`/financial/commissions/${id}`, {
      method: "PATCH",
      body: payload,
    });
  },

  getCampaigns(params: {
    tenantId: string;
    type?: ApiCampaignType;
    status?: ApiCampaignStatus;
  }) {
    return request<ApiCampaign[]>(
      `/marketing/campaigns${buildQuery({
        tenantId: params.tenantId,
        type: params.type,
        status: params.status,
      })}`,
    );
  },

  createCampaign(payload: CreateCampaignPayload) {
    return request<ApiCampaign>("/marketing/campaigns", {
      method: "POST",
      body: payload,
    });
  },

  dispatchCampaign(id: string) {
    return request<{
      campaign: ApiCampaign;
      count: number;
      recipients: ApiAudienceRecipient[];
    }>(`/marketing/campaigns/${id}/dispatch`, {
      method: "POST",
    });
  },

  previewAudience(params: {
    tenantId: string;
    type: ApiCampaignType;
    inactiveDays?: number;
    birthMonth?: number;
    minCompletedVisits?: number;
    couponId?: string;
  }) {
    return request<ApiAudiencePreview>(
      `/marketing/audience${buildQuery({
        tenantId: params.tenantId,
        type: params.type,
        inactiveDays:
          params.inactiveDays !== undefined
            ? String(params.inactiveDays)
            : undefined,
        birthMonth:
          params.birthMonth !== undefined
            ? String(params.birthMonth)
            : undefined,
        minCompletedVisits:
          params.minCompletedVisits !== undefined
            ? String(params.minCompletedVisits)
            : undefined,
        couponId: params.couponId,
      })}`,
    );
  },

  getCoupons(params: { tenantId: string; isActive?: boolean }) {
    return request<ApiCoupon[]>(
      `/marketing/coupons${buildQuery({
        tenantId: params.tenantId,
        isActive:
          params.isActive === undefined
            ? undefined
            : params.isActive
              ? "true"
              : "false",
      })}`,
    );
  },

  createCoupon(payload: CreateCouponPayload) {
    return request<ApiCoupon>("/marketing/coupons", {
      method: "POST",
      body: payload,
    });
  },

  getUnits(params: { tenantId: string; userId?: string }) {
    return request<ApiUnitsResponse>(
      `/management/units${buildQuery({
        tenantId: params.tenantId,
        userId: params.userId,
      })}`,
    );
  },

  getGoals(params: {
    tenantId: string;
    professionalId?: string;
    status?: ApiGoalStatus;
    includeNetwork?: boolean;
  }) {
    return request<ApiGoalsResponse>(
      `/management/goals${buildQuery({
        tenantId: params.tenantId,
        professionalId: params.professionalId,
        status: params.status,
        includeNetwork: params.includeNetwork ? "true" : undefined,
      })}`,
    );
  },

  createGoal(payload: CreateGoalPayload) {
    return request<ApiGoal>("/management/goals", {
      method: "POST",
      body: payload,
    });
  },

  getClients(params: { tenantId: string; q?: string }) {
    return request<ApiClient[]>(
      `/clients${buildQuery({
        tenantId: params.tenantId,
        q: params.q,
      })}`,
    );
  },

  getClient(id: string) {
    return request<ApiClient>(`/clients/${id}`);
  },

  getCustomerProfile(params: { tenantId: string; userId?: string }) {
    return request<ApiCustomerProfile>(
      `/customer/profile${buildQuery({
        tenantId: params.tenantId,
        userId: params.userId,
      })}`,
    );
  },

  updateCustomerProfile(payload: UpdateCustomerProfilePayload) {
    return request<ApiCustomerProfile>("/customer/profile", {
      method: "PATCH",
      body: payload,
    });
  },

  createClient(payload: CreateClientPayload) {
    return request<ApiClient>("/clients", {
      method: "POST",
      body: payload,
    });
  },

  getClientHistory(id: string) {
    return request<ApiClientHistoryItem[]>(`/clients/${id}/history`);
  },

  createClientHistory(id: string, payload: CreateClientHistoryPayload) {
    return request<ApiClientHistoryItem>(`/clients/${id}/history`, {
      method: "POST",
      body: payload,
    });
  },

  getReminders(params: {
    tenantId: string;
    clientId?: string;
    status?: ApiReminderStatus;
    from?: string;
    to?: string;
  }) {
    return request<ApiReminder[]>(
      `/reminders${buildQuery({
        tenantId: params.tenantId,
        clientId: params.clientId,
        status: params.status,
        from: params.from,
        to: params.to,
      })}`,
    );
  },

  createReminder(payload: CreateReminderPayload) {
    return request<ApiReminder>("/reminders", {
      method: "POST",
      body: payload,
    });
  },

  getWhatsappConfig(tenantId: string) {
    return request<ApiWhatsappConfig>(
      `/whatsapp/config${buildQuery({ tenantId })}`,
    );
  },

  upsertWhatsappConfig(payload: UpsertWhatsappConfigPayload) {
    return request<ApiWhatsappConfig>("/whatsapp/config", {
      method: "POST",
      body: payload,
    });
  },

  getAssignmentPolicy() {
    return request<{ policy: "rotation" | "newest" }>("/whatsapp/assignment-policy");
  },

  saveAssignmentPolicy(policy: "rotation" | "newest") {
    return request<{ policy: "rotation" | "newest" }>("/whatsapp/assignment-policy", {
      method: "POST",
      body: { policy },
    });
  },

  simulateWhatsappConversation(payload: {
    from: string;
    text?: string;
    audioBase64?: string;
    mimeType?: string;
  }) {
    return request<{
      reply: string;
      step: string;
      appointmentId: string | null;
      ai: boolean;
      aiNote?: string | null;
      transcript?: string | null;
    }>("/whatsapp/conversation", {
      method: "POST",
      body: payload,
    });
  },

  sendWhatsappMessage(payload: SendWhatsappPayload) {
    return request<ApiMessageLog>("/whatsapp/send", {
      method: "POST",
      body: payload,
    });
  },

  getWhatsappLogs(params: {
    tenantId: string;
    type?: ApiWhatsappMessageType;
    status?: ApiWhatsappMessageStatus;
  }) {
    return request<ApiMessageLog[]>(
      `/whatsapp/logs${buildQuery({
        tenantId: params.tenantId,
        type: params.type,
        status: params.status,
      })}`,
    );
  },

  getInventory(params: {
    tenantId: string;
    category?: ApiProductCategory;
    lowStock?: boolean;
  }) {
    return request<ApiProduct[]>(
      `/inventory${buildQuery({
        tenantId: params.tenantId,
        category: params.category,
        lowStock: params.lowStock ? "true" : undefined,
      })}`,
    );
  },

  createProduct(payload: CreateProductPayload) {
    return request<ApiProduct>("/inventory", {
      method: "POST",
      body: payload,
    });
  },

  adjustStock(id: string, payload: AdjustStockPayload) {
    return request<ApiProduct>(`/inventory/${id}/stock`, {
      method: "PATCH",
      body: payload,
    });
  },

  getSubscriptionPlans(params: { tenantId: string; activeOnly?: boolean }) {
    return request<ApiSubscriptionPlan[]>(
      `/subscriptions/plans${buildQuery({
        tenantId: params.tenantId,
        activeOnly: params.activeOnly ? "true" : undefined,
      })}`,
    );
  },

  createSubscriptionPlan(payload: CreateSubscriptionPlanPayload) {
    return request<ApiSubscriptionPlan>("/subscriptions/plans", {
      method: "POST",
      body: payload,
    });
  },

  subscribeClient(payload: {
    tenantId: string;
    clientId: string;
    planId: string;
  }) {
    return request<ApiSubscriptionMember>("/subscriptions/subscribe", {
      method: "POST",
      body: payload,
    });
  },

  getTenantClub(
    tenantId: string,
    params?: { status?: ApiSubscriptionStatus | ApiClubStatus },
  ) {
    return request<ApiTenantClub>(
      `/subscriptions/tenant/${encodeURIComponent(tenantId)}${buildQuery({
        status: params?.status,
      })}`,
    );
  },

  getSubscriptionMembers(params: {
    tenantId: string;
    status?: ApiSubscriptionStatus;
    customerId?: string;
    clientId?: string;
  }) {
    return request<ApiSubscriptionMember[]>(
      `/subscriptions/members${buildQuery({
        tenantId: params.tenantId,
        status: params.status,
        customerId: params.customerId,
        clientId: params.clientId,
      })}`,
    );
  },
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Ocorreu um erro inesperado.";
}

export function mapApiService(service: ApiService) {
  return {
    id: service.id,
    name: service.name,
    description: service.description ?? "Serviço do Studio Barbearia.",
    price: Number(service.price),
    durationMinutes: service.durationMin,
  };
}

export function mapApiProfessional(user: ApiUser) {
  return {
    id: user.id,
    name: user.name,
    role:
      user.role === "PROFESSIONAL"
        ? "Profissional"
        : user.role === "ADMIN"
          ? "Proprietário"
          : user.role === "RECEPTIONIST"
            ? "Recepção"
            : "Equipe",
    rating: 5,
  };
}

export function mapApiCustomerProfile(user: ApiUser) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email ?? "—",
    memberSince: new Date(user.createdAt).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    }),
    totalVisits: 0,
  };
}

export function buildStartTimeIso(date: Date, timeLabel: string): string {
  const [hours, minutes] = timeLabel.split(":").map(Number);
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next.toISOString();
}

export function dayRangeIso(date: Date): { from: string; to: string } {
  const from = new Date(date);
  from.setHours(0, 0, 0, 0);

  const to = new Date(date);
  to.setHours(23, 59, 59, 999);

  return { from: from.toISOString(), to: to.toISOString() };
}

export function monthRangeIso(date: Date): { from: string; to: string } {
  const from = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

  return { from: from.toISOString(), to: to.toISOString() };
}

export function mapApiAppointmentToSchedule(
  appointment: ApiAppointment,
): import("@/lib/schedule-data").ScheduleAppointment {
  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);
  const durationMinutes = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 60000),
  );
  const serviceName =
    appointment.services[0]?.service.name ?? "Serviço";

  const year = start.getFullYear();
  const month = String(start.getMonth() + 1).padStart(2, "0");
  const day = String(start.getDate()).padStart(2, "0");

  return {
    id: appointment.id,
    staffId: appointment.staff.id,
    staffName: appointment.staff.name,
    customerName: appointment.customer.name,
    serviceName,
    dateKey: `${year}-${month}-${day}`,
    startMinutes: start.getHours() * 60 + start.getMinutes(),
    durationMinutes,
    status: mapApiStatusToSchedule(appointment.status),
    insight: appointment.clientInsight ?? null,
  };
}

export function mapApiStatusToSchedule(
  status: ApiAppointmentStatus,
): import("@/lib/schedule-data").ScheduleStatus {
  switch (status) {
    case "PENDING":
    case "PENDING_PAYMENT":
      return "PENDING";
    case "CONFIRMED":
      return "CONFIRMED";
    case "IN_PROGRESS":
      return "IN_PROGRESS";
    case "COMPLETED":
      return "COMPLETED";
    case "CANCELLED":
    case "NO_SHOW":
      return "CANCELLED";
  }
}

export type ClientAppointmentView = {
  id: string;
  service: string;
  services: string[];
  professional: string;
  date: string;
  time: string;
  status: "CONFIRMED" | "PENDING" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  price: number;
  startTime: string;
  endTime: string;
};

export function mapApiAppointmentToClientView(
  appointment: ApiAppointment,
): ClientAppointmentView {
  const start = new Date(appointment.startTime);
  const services = appointment.services.map(
    (item) => item.service.name,
  );
  const service = appointment.services[0]?.service;

  return {
    id: appointment.id,
    service: services.join(" · ") || "Serviço",
    services: services.length > 0 ? services : ["Serviço"],
    professional: appointment.staff.name,
    date: start.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    }),
    time: start.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    status: mapApiStatusToClient(appointment.status),
    price: appointment.services.reduce(
      (sum, item) => sum + Number(item.service.price ?? 0),
      0,
    ) || Number(service?.price ?? 0),
    startTime: appointment.startTime,
    endTime: appointment.endTime,
  };
}

export function mapApiStatusToClient(
  status: ApiAppointmentStatus,
): ClientAppointmentView["status"] {
  switch (status) {
    case "PENDING":
    case "PENDING_PAYMENT":
      return "PENDING";
    case "CONFIRMED":
    case "IN_PROGRESS":
      return "CONFIRMED";
    case "COMPLETED":
      return "COMPLETED";
    case "NO_SHOW":
      return "NO_SHOW";
    case "CANCELLED":
      return "CANCELLED";
  }
}
