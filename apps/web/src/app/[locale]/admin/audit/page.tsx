import { AdminAudit } from "../../../../components/admin-audit";
import { requireLocale } from "../../../../lib/route-locale";

export default async function AdminAuditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  return <AdminAudit locale={requireLocale(localeParam)} />;
}
