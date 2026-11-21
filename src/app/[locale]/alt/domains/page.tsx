import { StubView } from "@/components/layout/StubView";

export default async function AltDomainsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <StubView locale={locale} themeVariant="alt" pageKey="domains" />;
}
