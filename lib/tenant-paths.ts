export const RESERVED_TENANT_SLUGS = new Set([
  "admin",
  "agendar",
  "cliente",
  "parceiro",
  "cadastro",
  "login",
  "super-admin",
  "clubby",
  "serwist",
  "icons",
  "manifest.json",
  "favicon.ico",
  "_next",
  "api",
]);

export function isReservedTenantSlug(slug: string) {
  return RESERVED_TENANT_SLUGS.has(slug.trim().toLowerCase());
}

export function tenantHref(slug: string | null | undefined, path = "") {
  const suffix = !path || path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;

  if (!slug || slug === "local") {
    return suffix || "/";
  }

  return `/${slug}${suffix}`;
}
