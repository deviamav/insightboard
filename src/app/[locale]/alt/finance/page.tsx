import { StubView } from "@/components/layout/StubView";

export default async function AltFinancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <StubView locale={locale} themeVariant="alt" pageKey="finance" />;
}
