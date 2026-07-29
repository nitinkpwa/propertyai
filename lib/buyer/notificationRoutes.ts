import type { CrmNotification, NotificationType } from "@/lib/crm/types";

/**
 * Deep-link map for buyer CRM notifications.
 * Keep in sync with buyer expectations (visits → visits page, properties → detail).
 */
export function getCrmNotificationHref(n: Pick<CrmNotification, "type" | "property_id" | "title" | "message">): string {
  const type = n.type as NotificationType | string;
  const propertyHref = n.property_id ? `/property/${n.property_id}` : null;

  switch (type) {
    case "site_visit_booked":
    case "site_visit_accepted":
    case "site_visit_rejected":
    case "site_visit_completed":
    case "site_visit_cancelled":
    case "visit_feedback_submitted":
      return "/buyer/site-visits";

    case "property_saved":
      return propertyHref ?? "/buyer/saved";

    case "property_compared":
      return "/buyer/compare";

    case "property_updated":
    case "new_inquiry":
      return propertyHref ?? "/properties";

    case "booking_completed":
    case "negotiation_started":
      return propertyHref ?? "/buyer";

    case "follow_up_due":
    case "reminder":
    case "status_changed":
      return propertyHref ?? "/buyer/notifications";

    case "lead_assigned":
    case "lead_reassigned":
    case "new_lead":
    case "general":
    default: {
      // Heuristic fallbacks from title/message when type is generic
      const blob = `${n.title ?? ""} ${n.message ?? ""}`.toLowerCase();
      if (blob.includes("visit")) return "/buyer/site-visits";
      if (blob.includes("saved") || blob.includes("wishlist")) return "/buyer/saved";
      if (blob.includes("compare")) return "/buyer/compare";
      if (propertyHref) return propertyHref;
      return "/buyer/notifications";
    }
  }
}
