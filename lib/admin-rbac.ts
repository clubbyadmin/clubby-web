import type { ApiUserRole } from "@/services/api";
import {
  Bell,
  CalendarClock,
  CalendarDays,
  Crown,
  FlaskConical,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Package,
  ShieldCheck,
  Target,
  UserCog,
  Users,
  Wallet,
  Scale,
  type LucideIcon,
} from "lucide-react";

export type AdminSessionUser = {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string;
  role: ApiUserRole;
};

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: ApiUserRole[];
  match: (pathname: string, search: string) => boolean;
};

const MANAGER_ROLES: ApiUserRole[] = ["SUPER_ADMIN", "ADMIN"];
const FRONT_DESK_ROLES: ApiUserRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "RECEPTIONIST",
];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: MANAGER_ROLES,
    match: (pathname) => pathname === "/admin",
  },
  {
    href: "/admin/agenda",
    label: "Agenda Kanban",
    icon: CalendarDays,
    roles: FRONT_DESK_ROLES,
    match: (pathname) => pathname.startsWith("/admin/agenda"),
  },
  {
    href: "/admin/meu-painel",
    label: "Meu Painel",
    icon: CalendarClock,
    roles: ["PROFESSIONAL"],
    match: (pathname) =>
      pathname === "/admin/meu-painel" ||
      (pathname.startsWith("/admin/meu-painel") &&
        !pathname.startsWith("/admin/meu-painel/comissoes")),
  },
  {
    href: "/admin/meu-painel/comissoes",
    label: "Extrato de Comissões",
    icon: Wallet,
    roles: ["PROFESSIONAL"],
    match: (pathname) => pathname.startsWith("/admin/meu-painel/comissoes"),
  },
  {
    href: "/admin/clientes",
    label: "Clientes",
    icon: Users,
    roles: FRONT_DESK_ROLES,
    match: (pathname, search) =>
      pathname.startsWith("/admin/clientes") &&
      !search.includes("tab=lembretes"),
  },
  {
    href: "/admin/clientes?tab=lembretes",
    label: "Lembretes",
    icon: Bell,
    roles: ["RECEPTIONIST"],
    match: (pathname, search) =>
      pathname.startsWith("/admin/clientes") &&
      search.includes("tab=lembretes"),
  },
  {
    href: "/admin/financeiro",
    label: "Financeiro",
    icon: Wallet,
    roles: MANAGER_ROLES,
    match: (pathname) =>
      pathname === "/admin/financeiro" ||
      (pathname.startsWith("/admin/financeiro") &&
        !pathname.startsWith("/admin/financeiro/comissoes")),
  },
  {
    href: "/admin/financeiro/comissoes",
    label: "Comissões",
    icon: Scale,
    roles: MANAGER_ROLES,
    match: (pathname) => pathname.startsWith("/admin/financeiro/comissoes"),
  },
  {
    href: "/admin/marketing",
    label: "Marketing",
    icon: Megaphone,
    roles: MANAGER_ROLES,
    match: (pathname) => pathname.startsWith("/admin/marketing"),
  },
  {
    href: "/admin/whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    roles: FRONT_DESK_ROLES,
    match: (pathname) => pathname.startsWith("/admin/whatsapp"),
  },
  {
    href: "/admin/usuarios",
    label: "Usuários",
    icon: UserCog,
    roles: MANAGER_ROLES,
    match: (pathname) => pathname.startsWith("/admin/usuarios"),
  },
  {
    href: "/admin/gestao",
    label: "Metas",
    icon: Target,
    roles: MANAGER_ROLES,
    match: (pathname) => pathname.startsWith("/admin/gestao"),
  },
  {
    href: "/admin/estoque",
    label: "Estoque",
    icon: Package,
    roles: MANAGER_ROLES,
    match: (pathname) => pathname.startsWith("/admin/estoque"),
  },
  {
    href: "/admin/assinaturas",
    label: "Clube",
    icon: Crown,
    roles: MANAGER_ROLES,
    match: (pathname) => pathname.startsWith("/admin/assinaturas"),
  },
  {
    href: "/admin/testes",
    label: "Testes",
    icon: FlaskConical,
    roles: MANAGER_ROLES,
    match: (pathname) => pathname.startsWith("/admin/testes"),
  },
  {
    href: "/super-admin",
    label: "Plataforma",
    icon: ShieldCheck,
    roles: ["SUPER_ADMIN"],
    match: (pathname) => pathname.startsWith("/super-admin"),
  },
];

export const ROLE_LABELS: Record<ApiUserRole, string> = {
  SUPER_ADMIN: "Super-admin Clubby",
  ADMIN: "Administrador",
  RECEPTIONIST: "Recepção",
  PROFESSIONAL: "Profissional",
  CUSTOMER: "Cliente",
};

export const DEMO_STAFF_LOGINS: Array<{
  role: Extract<ApiUserRole, "ADMIN" | "RECEPTIONIST" | "PROFESSIONAL">;
  label: string;
  phone: string;
}> = [
  { role: "ADMIN", label: "Gestor", phone: "5511900000001" },
  { role: "RECEPTIONIST", label: "Recepção", phone: "5511900000002" },
  { role: "PROFESSIONAL", label: "Profissional", phone: "5511910000001" },
];

export function isManagerRole(role: ApiUserRole | null | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function navItemsForRole(role: ApiUserRole | null | undefined) {
  if (!role || role === "CUSTOMER") {
    return [];
  }

  return ADMIN_NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function homePathForRole(role: ApiUserRole | null | undefined) {
  if (role === "PROFESSIONAL") {
    return "/admin/meu-painel";
  }

  if (role === "RECEPTIONIST") {
    return "/admin/agenda";
  }

  if (role === "CUSTOMER" || !role) {
    return "/";
  }

  if (role === "SUPER_ADMIN") {
    return "/super-admin";
  }

  return "/admin";
}

export function canAccessAdminPath(
  pathname: string,
  search: string,
  role: ApiUserRole | null | undefined,
) {
  if (!role || role === "CUSTOMER") {
    return false;
  }

  if (role === "SUPER_ADMIN") {
    return (
      pathname.startsWith("/admin") || pathname.startsWith("/super-admin")
    );
  }

  if (isManagerRole(role)) {
    return pathname.startsWith("/admin");
  }

  return navItemsForRole(role).some((item) => {
    const pathOnly = item.href.split("?")[0];

    if (item.match(pathname, search)) {
      return true;
    }

    return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
  });
}

export function firstNameFrom(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export const LOCAL_ADMIN_USER: AdminSessionUser = {
  id: "local-admin",
  tenantId: "local",
  name: "Gestor local",
  email: null,
  phone: "",
  role: "ADMIN",
};
