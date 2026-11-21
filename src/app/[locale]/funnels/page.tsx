import { FunnelsView } from "@/components/funnels/FunnelsView";

export default async function FunnelsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <FunnelsView locale={locale} themeVariant="primary" />;
}
