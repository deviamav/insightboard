import { StubView } from "@/components/layout/StubView";

export default async function AltLeadsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <StubView locale={locale} themeVariant="alt" pageKey="leads" />;
}
