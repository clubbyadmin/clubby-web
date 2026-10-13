import { isReservedTenantSlug } from "@/lib/tenant-paths";
import type { Metadata } from "next";
import { TenantShopHome } from "./tenant-shop-home";

type TenantPublicPageProps = {
  params: Promise<{ slug: string }>;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: TenantPublicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const normalized = slug.trim().toLowerCase();

  if (!normalized || isReservedTenantSlug(normalized)) {
    return { title: "Não encontrado" };
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/tenants/slug/${encodeURIComponent(normalized)}`,
      { next: { revalidate: 60 } },
    );

    if (!response.ok) {
      return { title: "Estabelecimento não encontrado" };
    }

    const tenant = (await response.json()) as {
      name: string;
      theme?: { tagline?: string };
    };

    return {
      title: tenant.name,
      description:
        tenant.theme?.tagline ?? `Agende horários em ${tenant.name}.`,
    };
  } catch {
    return { title: "Clubby" };
  }
}

export default function TenantPublicPage() {
  return <TenantShopHome />;
}
