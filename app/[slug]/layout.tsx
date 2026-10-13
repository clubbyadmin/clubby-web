import { TenantPublicShell } from "@/components/shell/tenant-public-shell";
import { isReservedTenantSlug } from "@/lib/tenant-paths";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

type TenantSlugLayoutProps = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function TenantSlugLayout({
  children,
  params,
}: TenantSlugLayoutProps) {
  const { slug } = await params;
  const normalized = slug.trim().toLowerCase();

  if (!normalized || isReservedTenantSlug(normalized)) {
    notFound();
  }

  return <TenantPublicShell slug={normalized}>{children}</TenantPublicShell>;
}
