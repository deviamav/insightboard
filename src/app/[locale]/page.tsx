import { DashboardView } from "@/components/dashboard/DashboardView";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <DashboardView locale={locale} themeVariant="primary" />;
}
