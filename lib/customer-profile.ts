const PAYMENT_KEY = "clubby.customer-payment";
const INTEGRATION_KEY = "clubby.customer-integrations";

export type StoredPaymentMethod = {
  brand: string;
  last4: string;
  holder: string;
  expiry: string;
};

export type StoredIntegrations = {
  googleCalendar: boolean;
};

const DEFAULT_PAYMENT: StoredPaymentMethod = {
  brand: "Visa",
  last4: "4242",
  holder: "JOAO CLUBBY",
  expiry: "12/28",
};

function readJson<T>(key: string, tenantId: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(`${key}.${tenantId}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, tenantId: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(`${key}.${tenantId}`, JSON.stringify(value));
}

export function readPaymentMethod(tenantId: string): StoredPaymentMethod {
  return readJson<StoredPaymentMethod>(PAYMENT_KEY, tenantId) ?? DEFAULT_PAYMENT;
}

export function writePaymentMethod(
  tenantId: string,
  value: StoredPaymentMethod,
) {
  writeJson(PAYMENT_KEY, tenantId, value);
}

export function readIntegrations(tenantId: string): StoredIntegrations {
  return (
    readJson<StoredIntegrations>(INTEGRATION_KEY, tenantId) ?? {
      googleCalendar: false,
    }
  );
}

export function writeIntegrations(
  tenantId: string,
  value: StoredIntegrations,
) {
  writeJson(INTEGRATION_KEY, tenantId, value);
}

export function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, "$1-$2");
}

export function formatPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  if (digits.startsWith("55") && digits.length > 4) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`.replace(/[-\s]+$/, "");
  }
  return digits;
}

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function toDateInputValue(value: string | Date | null | undefined) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export type ViaCepAddress = {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
};

export async function lookupCep(cep: string): Promise<ViaCepAddress | null> {
  const digits = digitsOnly(cep);
  if (digits.length !== 8) {
    return null;
  }

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    erro?: boolean;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
  };

  if (payload.erro) {
    return null;
  }

  return {
    street: payload.logradouro ?? "",
    neighborhood: payload.bairro ?? "",
    city: payload.localidade ?? "",
    state: payload.uf ?? "",
  };
}
