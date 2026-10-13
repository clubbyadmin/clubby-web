export const DEMO_PRESENTATION_LOGINS = [
  {
    id: "super-admin",
    label: "Super-Admin Clubby",
    email: "admin@clubby.com.br",
    password: "admin123",
    destination: "Painel global",
  },
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
