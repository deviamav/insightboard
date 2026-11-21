import { Suspense } from "react";
import { LoginView } from "@/components/auth/LoginView";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <Suspense>
      <LoginView locale={locale} />
    </Suspense>
  );
}
