import { AdminListingEditor } from "../../../../../components/admin-listing-editor";
import { requireLocale } from "../../../../../lib/route-locale";

export default async function EditAdminListingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: localeParam, id } = await params;
  return (
    <AdminListingEditor locale={requireLocale(localeParam)} listingId={id} />
  );
}
