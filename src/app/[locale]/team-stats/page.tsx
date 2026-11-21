import { StubView } from "@/components/layout/StubView";

export default async function TeamStatsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <StubView locale={locale} themeVariant="primary" pageKey="teamStats" />;
}
