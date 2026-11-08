export type SiteEvent = "listing_view" | "listing_search" | "whatsapp_click";

export function track(
  _event: SiteEvent,
  _properties?: Readonly<Record<string, string | number>>,
) {
  void _event;
  void _properties;
}
