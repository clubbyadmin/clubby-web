"use client";

import { type AdminSessionUser } from "@/lib/admin-rbac";
import {
  clearStoredAdminSession,
  readStoredAdminUser,
  writeStoredAdminUser,
} from "@/lib/admin-session-storage";
import { setAccessToken } from "@/services/api";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AdminSessionContextValue = {
  user: AdminSessionUser | null;
  setSession: (session: {
    accessToken: string;
    user: AdminSessionUser;
  }) => void;
  clearSession: () => void;
};

const AdminSessionContext = createContext<AdminSessionContextValue | null>(
  null,
);

type AdminSessionProviderProps = {
  children: ReactNode;
};

export function AdminSessionProvider({ children }: AdminSessionProviderProps) {
  const [user, setUser] = useState<AdminSessionUser | null>(null);

  const setSession = useCallback(
    (session: { accessToken: string; user: AdminSessionUser }) => {
      setAccessToken(session.accessToken);
      writeStoredAdminUser(session.user);
      setUser(session.user);
    },
    [],
  );

  const clearSession = useCallback(() => {
    setAccessToken(null);
    clearStoredAdminSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      setSession,
      clearSession,
    }),
    [clearSession, setSession, user],
  );

  return (
    <AdminSessionContext.Provider value={value}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  const context = useContext(AdminSessionContext);

  if (!context) {
    throw new Error("useAdminSession must be used within AdminSessionProvider");
  }

  return context;
}

export function useAdminSessionOptional() {
  return useContext(AdminSessionContext);
}
