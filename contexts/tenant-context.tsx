"use client";

import { ErrorState, LoadingState } from "@/components/api-state";
import {
  DEFAULT_TENANT_SLUG,
  FALLBACK_TENANT,
  type TenantConfig,
  tenantThemeStyles,
} from "@/lib/tenant-types";
import { api, getErrorMessage } from "@/services/api";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type TenantContextValue = {
  tenant: TenantConfig;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  updateTheme: (theme: Partial<TenantConfig["theme"]>) => void;
};

const TenantContext = createContext<TenantContextValue | null>(null);

type TenantProviderProps = {
  children: ReactNode;
  slug?: string;
};

export function TenantProvider({
  children,
  slug = DEFAULT_TENANT_SLUG,
}: TenantProviderProps) {
  const [tenant, setTenant] = useState<TenantConfig>(FALLBACK_TENANT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.getTenant(slug);
      setTenant(response);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setTenant(FALLBACK_TENANT);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    let cancelled = false;

    api
      .getTenant(slug)
      .then((response) => {
        if (!cancelled) {
          setTenant(response);
          setLoading(false);
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(getErrorMessage(requestError));
          setTenant(FALLBACK_TENANT);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const updateTheme = useCallback((theme: Partial<TenantConfig["theme"]>) => {
    setTenant((current) => ({
      ...current,
      theme: {
        ...current.theme,
        ...theme,
      },
    }));
  }, []);

  const value = useMemo(
    () => ({
      tenant,
      loading,
      error,
      reload,
      updateTheme,
    }),
    [tenant, loading, error, reload, updateTheme],
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error("useTenant deve ser usado dentro de TenantProvider.");
  }

  return context;
}

type TenantGateProps = {
  children: ReactNode;
};

export function TenantGate({ children }: TenantGateProps) {
  const { loading, error, reload } = useTenant();

  if (loading) {
    return <LoadingState message="Carregando configurações do salão..." />;
  }

  if (error) {
    return (
      <ErrorState
        message={`${error} Usando tema padrão do Studio Barbearia.`}
        onRetry={() => void reload()}
      />
    );
  }

  return children;
}

export function useTenantThemeStyle() {
  const { tenant } = useTenant();
  return tenantThemeStyles(tenant.theme);
}
