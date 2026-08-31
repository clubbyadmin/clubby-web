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
  | "TENANT_OWNER"
  | "STAFF"
  | "CUSTOMER";

export type ApiUser = {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string;
  role: ApiUserRole;
  commissionRate: string | number;
  createdAt: string;
  updatedAt: string;
};

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

export type ApiTenant = {
  id: string;
  slug: string;
  name: string;
  whatsappNumber: string;
  theme: {
    primaryColor: string;
    primaryColorStrong: string;
    logoUrl: string;
    tagline: string;
  };
};

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...init } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
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
  getServices(tenantId?: string) {
    return request<ApiService[]>(
      `/services${buildQuery({ tenantId })}`,
    );
  },

  getUsers(params?: { role?: ApiUserRole; tenantId?: string }) {
    return request<ApiUser[]>(
      `/users${buildQuery({
        role: params?.role,
        tenantId: params?.tenantId,
      })}`,
    );
  },

  getUser(id: string) {
    return request<ApiUser>(`/users/${id}`);
  },

  getTenant(slug: string) {
    return request<ApiTenant>(`/tenants/${slug}`);
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
      user.role === "STAFF"
        ? "Profissional"
        : user.role === "TENANT_OWNER"
          ? "Proprietário"
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
