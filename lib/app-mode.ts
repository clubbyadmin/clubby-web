export type ClubbyWebMode = "demo" | "production";

export function resolveWebAppMode(): ClubbyWebMode {
  const explicit = (process.env.NEXT_PUBLIC_APP_MODE ?? "").trim().toLowerCase();

  if (explicit === "demo") {
    return "demo";
  }

  if (explicit === "production") {
    return "production";
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (host === "demo.localhost" || host.startsWith("demo.")) {
      return "demo";
    }
  }

  return "production";
}

export function isDemoMode() {
  return resolveWebAppMode() === "demo";
}
