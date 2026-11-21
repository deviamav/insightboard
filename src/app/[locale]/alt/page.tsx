import { DashboardView } from "@/components/dashboard/DashboardView";

export default async function AltDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <DashboardView locale={locale} themeVariant="alt" />;
}
