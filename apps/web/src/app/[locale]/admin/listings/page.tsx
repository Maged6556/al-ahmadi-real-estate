import { AdminListings } from "../../../../components/admin-listings";
import { requireLocale } from "../../../../lib/route-locale";

export default async function AdminListingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  return <AdminListings locale={requireLocale(localeParam)} />;
}
