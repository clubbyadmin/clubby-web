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

const TEST_TENANT_SLUG_KEY = "clubby.testTenantSlug";

type TenantContextValue = {
  tenant: TenantConfig;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  switchTenantSlug: (nextSlug: string) => void;
  resetTenantSlug: () => void;
  updateTheme: (theme: Partial<TenantConfig["theme"]>) => void;
};

const TenantContext = createContext<TenantContextValue | null>(null);

type TenantProviderProps = {
  children: ReactNode;
  slug?: string;
};

function readTestTenantSlug() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return sessionStorage.getItem(TEST_TENANT_SLUG_KEY);
  } catch {
    return null;
  }
}

function persistTestTenantSlug(nextSlug: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (nextSlug) {
      sessionStorage.setItem(TEST_TENANT_SLUG_KEY, nextSlug);
    } else {
      sessionStorage.removeItem(TEST_TENANT_SLUG_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

export function TenantProvider({ children, slug }: TenantProviderProps) {
  const lockedSlug = slug;
  const [activeSlug, setActiveSlug] = useState(
    () => lockedSlug ?? DEFAULT_TENANT_SLUG,
  );
  const [tenant, setTenant] = useState<TenantConfig>(FALLBACK_TENANT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lockedSlug) {
      setActiveSlug(lockedSlug);
      return;
    }

    const stored = readTestTenantSlug();
    if (stored) {
      setActiveSlug(stored);
    }
  }, [lockedSlug]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.getTenant(activeSlug);
      setTenant(response);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setTenant(FALLBACK_TENANT);
    } finally {
      setLoading(false);
    }
  }, [activeSlug]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getTenant(activeSlug)
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
  }, [activeSlug]);

  const switchTenantSlug = useCallback((nextSlug: string) => {
    persistTestTenantSlug(nextSlug);
    setActiveSlug(nextSlug);
  }, []);

  const resetTenantSlug = useCallback(() => {
    persistTestTenantSlug(null);
    setActiveSlug(DEFAULT_TENANT_SLUG);
  }, []);

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
      switchTenantSlug,
      resetTenantSlug,
      updateTheme,
    }),
    [tenant, loading, error, reload, switchTenantSlug, resetTenantSlug, updateTheme],
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
  strict?: boolean;
};

export function TenantGate({ children, strict = false }: TenantGateProps) {
  const { loading, error, reload } = useTenant();

  if (loading) {
    return <LoadingState message="Carregando configurações do salão..." />;
  }

  if (error) {
    return (
      <ErrorState
        title={strict ? "Estabelecimento não encontrado" : undefined}
        message={
          strict
            ? error
            : `${error} Usando tema padrão do Studio Barbearia.`
        }
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
