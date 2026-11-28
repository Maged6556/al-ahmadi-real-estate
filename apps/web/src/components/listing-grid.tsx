import type { Locale } from "@al-ahmadi/shared";
import type { PublicListing } from "../lib/api";
import { Icon } from "../components/ui/icon";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { getMessages } from "../lib/i18n";
import { ListingCard } from "./listing-card";

export function ListingGrid({
  listings,
  locale,
}: {
  listings: PublicListing[];
  locale: Locale;
}) {
  const messages = getMessages(locale);
  if (listings.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon" aria-hidden="true">
          <Icon icon={faMagnifyingGlass} size="3x" />
        </span>
        <h2>{messages.listings.emptyTitle}</h2>
        <p>{messages.listings.emptyText}</p>
      </div>
    );
  }

  return (
    <div className="listing-grid">
      {listings.map((listing) => (
        <ListingCard key={listing.slug} listing={listing} locale={locale} />
      ))}
    </div>
  );
}
