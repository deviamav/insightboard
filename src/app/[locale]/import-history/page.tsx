import { StubView } from "@/components/layout/StubView";

export default async function ImportHistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <StubView locale={locale} themeVariant="primary" pageKey="importHistory" />;
}
