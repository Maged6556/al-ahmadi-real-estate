import { AdminGate } from "../../../components/admin-gate";
import { requireLocale } from "../../../lib/route-locale";

export default async function AdminLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale: localeParam } = await params;
  const locale = requireLocale(localeParam);
  return <AdminGate locale={locale}>{children}</AdminGate>;
}
