import { FunnelsView } from "@/components/funnels/FunnelsView";

export default async function AltFunnelsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <FunnelsView locale={locale} themeVariant="alt" />;
}
