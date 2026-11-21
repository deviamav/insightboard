import { redirect } from "next/navigation";
import { UsersView } from "@/components/users/UsersView";
import { isAdminAuthenticated } from "@/lib/auth";

export default async function AltUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!(await isAdminAuthenticated())) {
    redirect(`/${locale}/alt`);
  }

  return <UsersView locale={locale} themeVariant="alt" />;
}
