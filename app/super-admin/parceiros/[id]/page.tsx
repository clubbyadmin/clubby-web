import { PartnerDetailBoard } from "./partner-detail-board";

type PartnerPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PartnerDetailPage({ params }: PartnerPageProps) {
  const { id } = await params;
  return <PartnerDetailBoard partnerId={id} />;
}
