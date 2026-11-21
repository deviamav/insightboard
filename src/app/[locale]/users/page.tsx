import { redirect } from "next/navigation";
import { UsersView } from "@/components/users/UsersView";
import { isAdminAuthenticated } from "@/lib/auth";

export default async function UsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!(await isAdminAuthenticated())) {
    redirect(`/${locale}`);
  }

  return <UsersView locale={locale} themeVariant="primary" />;
}
