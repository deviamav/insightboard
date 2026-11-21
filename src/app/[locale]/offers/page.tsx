import { OffersView } from "@/components/offers/OffersView";

export default async function OffersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <OffersView locale={locale} themeVariant="primary" />;
}
