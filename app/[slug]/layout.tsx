import { TenantPublicShell } from "@/components/shell/tenant-public-shell";
import { isReservedTenantSlug } from "@/lib/tenant-paths";
import { Syne } from "next/font/google";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

const portalDisplay = Syne({
  subsets: ["latin"],
  variable: "--font-portal-display",
  weight: ["500", "600", "700"],
});

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

  return (
    <div className={`${portalDisplay.variable} min-h-full`}>
      <TenantPublicShell slug={normalized}>{children}</TenantPublicShell>
    </div>
  );
}
