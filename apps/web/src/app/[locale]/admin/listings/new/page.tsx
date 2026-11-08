import { AdminListingEditor } from "../../../../../components/admin-listing-editor";
import { requireLocale } from "../../../../../lib/route-locale";

export default async function NewAdminListingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  return <AdminListingEditor locale={requireLocale(localeParam)} />;
}
