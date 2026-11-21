import { AdminDataView } from "@/components/admin/AdminDataView";

export default async function AdminDataPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <AdminDataView locale={locale} themeVariant="primary" />;
}
