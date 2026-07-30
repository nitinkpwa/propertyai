import type { CrmNotification, NotificationType } from "@/lib/crm/types";

/**
 * Deep-link map for buyer CRM notifications.
 * One destination per notification type — visit → visits, property → detail, saved → saved.
 */
export function getCrmNotificationHref(
  n: Pick<CrmNotification, "type" | "property_id" | "title" | "message">,
): string {
  const type = n.type as NotificationType | string;
  const propertyHref = n.property_id ? `/property/${n.property_id}` : null;
  const blob = `${n.title ?? ""} ${n.message ?? ""}`.toLowerCase();

  switch (type) {
    case "site_visit_booked":
    case "site_visit_accepted":
    case "site_visit_rejected":
    case "site_visit_completed":
    case "site_visit_cancelled":
    case "visit_feedback_submitted":
    case "visit_rescheduled":
    case "visit_approved":
      return "/buyer/site-visits";

    case "property_saved":
    case "wishlist_update":
      return propertyHref ?? "/buyer/saved";

    case "property_compared":
      return "/buyer/compare";

    case "property_updated":
    case "property_approved":
    case "builder_update":
    case "new_inquiry":
      return propertyHref ?? "/properties";

    case "areaiq_insight":
    case "market_insight":
    case "price_drop":
      return propertyHref ?? "/ask";

    case "booking_completed":
    case "negotiation_started":
      return propertyHref ?? "/buyer";

    case "follow_up_due":
    case "reminder":
    case "status_changed":
      if (blob.includes("visit")) return "/buyer/site-visits";
      return propertyHref ?? "/buyer/notifications";

    case "lead_assigned":
    case "lead_reassigned":
    case "new_lead":
    case "general":
    default: {
      if (blob.includes("visit") || blob.includes("approved visit")) {
        return "/buyer/site-visits";
      }
      if (blob.includes("saved") || blob.includes("wishlist")) {
        return "/buyer/saved";
      }
      if (blob.includes("compare")) return "/buyer/compare";
      if (blob.includes("insight") || blob.includes("areaiq")) {
        return propertyHref ?? "/ask";
      }
      if (blob.includes("builder") || blob.includes("property approved")) {
        return propertyHref ?? "/properties";
      }
      if (propertyHref) return propertyHref;
      return "/buyer/notifications";
    }
  }
}
