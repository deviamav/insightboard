import { StatisticsView } from "@/components/dashboard/StatisticsView";

export default async function StatisticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <StatisticsView locale={locale} themeVariant="primary" />;
}
