import { AdminDashboard } from "../../../components/admin-dashboard";
import { requireLocale } from "../../../lib/route-locale";

export default async function AdminHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  return <AdminDashboard locale={requireLocale(localeParam)} />;
}
