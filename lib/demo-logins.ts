export const DEMO_STAFF_LOGINS = [
  {
    id: "admin",
    label: "Gestor do salão",
    email: "admin@demo-barber.clubby",
    password: "clubby-admin",
    destination: "Backoffice",
  },
  {
    id: "reception",
    label: "Recepção",
    email: "recepcao@demo-barber.clubby",
    password: "clubby-admin",
    destination: "Recepção",
  },
] as const;

export const DEMO_PLATFORM_LOGINS = [
  {
    id: "super-admin",
    label: "Super-Admin Clubby",
    email: "admin@clubby.com.br",
    password: "admin123",
    destination: "Painel global",
  },
] as const;

/** @deprecated use DEMO_STAFF_LOGINS / DEMO_PLATFORM_LOGINS */
export const DEMO_PRESENTATION_LOGINS = [
  ...DEMO_PLATFORM_LOGINS,
  ...DEMO_STAFF_LOGINS,
] as const;
