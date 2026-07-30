import type { CrmNotification, NotificationType } from "@/lib/crm/types";

/**
 * Deep links for Connect (builder) portal — never send partners to /buyer/*.
 */
export function getConnectNotificationHref(
  n: Pick<CrmNotification, "type" | "property_id" | "title" | "message">,
): string {
  const type = n.type as NotificationType | string;
  const propertyHref = n.property_id
    ? `/connect/dashboard?tab=properties&propertyId=${encodeURIComponent(n.property_id)}`
    : null;
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
      return "/connect/dashboard?tab=visits";

    case "new_inquiry":
    case "new_lead":
    case "lead_assigned":
    case "lead_reassigned":
      return "/connect/dashboard?tab=leads";

    case "property_updated":
    case "property_approved":
    case "builder_update":
      return propertyHref ?? "/connect/dashboard?tab=properties";

    case "follow_up_due":
    case "reminder":
    case "status_changed":
      if (blob.includes("visit")) return "/connect/dashboard?tab=visits";
      if (blob.includes("lead") || blob.includes("inquiry")) {
        return "/connect/dashboard?tab=leads";
      }
      return propertyHref ?? "/connect/dashboard?tab=notifications";

    case "general":
    default: {
      if (blob.includes("visit")) return "/connect/dashboard?tab=visits";
      if (blob.includes("lead") || blob.includes("inquiry") || blob.includes("buyer")) {
        return "/connect/dashboard?tab=leads";
      }
      if (blob.includes("property") || blob.includes("listing")) {
        return propertyHref ?? "/connect/dashboard?tab=properties";
      }
      return "/connect/dashboard?tab=notifications";
    }
  }
}
