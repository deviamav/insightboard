import { AnalyticsView } from "@/components/analytics/AnalyticsView";

export default async function AltAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <AnalyticsView locale={locale} themeVariant="alt" />;
}
