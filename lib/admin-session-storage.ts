import type { AdminSessionUser } from "@/lib/admin-rbac";

const TOKEN_KEY = "clubby.admin.accessToken";
const USER_KEY = "clubby.admin.user";

function canUseStorage() {
  return typeof window !== "undefined";
}

export function readStoredAccessToken() {
  if (!canUseStorage()) {
    return null;
  }

  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeStoredAccessToken(token: string | null) {
  if (!canUseStorage()) {
    return;
  }

  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore quota / private-mode failures
  }
}

export function readStoredAdminUser(): AdminSessionUser | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as AdminSessionUser;
    if (!parsed?.id || !parsed.role) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredAdminUser(user: AdminSessionUser | null) {
  if (!canUseStorage()) {
    return;
  }

  try {
    if (user) {
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(USER_KEY);
    }
  } catch {
    // ignore quota / private-mode failures
  }
}

export function clearStoredAdminSession() {
  writeStoredAccessToken(null);
  writeStoredAdminUser(null);
}
