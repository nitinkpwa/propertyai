/**
 * Property listing `status` — must match live DB constraint:
 *   CHECK (status = ANY (ARRAY['active','sold','rented','paused']))
 *
 * There is no `draft` value in production. Unpublished / pending-review
 * listings use `paused` until an admin publishes them as `active`.
 */

export const PROPERTY_STATUS = {
  ACTIVE: "active",
  SOLD: "sold",
  RENTED: "rented",
  PAUSED: "paused",
} as const;

export type PropertyStatus = (typeof PROPERTY_STATUS)[keyof typeof PROPERTY_STATUS];

/** Allowed DB values — use for validation / inserts. */
export const PROPERTY_STATUS_VALUES = [
  PROPERTY_STATUS.ACTIVE,
  PROPERTY_STATUS.SOLD,
  PROPERTY_STATUS.RENTED,
  PROPERTY_STATUS.PAUSED,
] as const;

/** Default for every create path (seller, admin, import, duplicate). */
export const PROPERTY_STATUS_DEFAULT_CREATE = PROPERTY_STATUS.PAUSED;

/** Human labels for generic/admin UI (DB value → display). */
export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  active: "Approved",
  paused: "Pending Review",
  sold: "Sold",
  rented: "Rented",
};

export function isPropertyStatus(value: unknown): value is PropertyStatus {
  return (
    typeof value === "string" &&
    (PROPERTY_STATUS_VALUES as readonly string[]).includes(value)
  );
}

/**
 * Coerce any legacy / form value into a DB-safe status.
 * Maps historical `draft` (and unknown values) to paused.
 */
export function toPropertyStatus(
  value: unknown,
  fallback: PropertyStatus = PROPERTY_STATUS_DEFAULT_CREATE,
): PropertyStatus {
  if (value === "draft" || value === "review" || value === "pending") {
    return PROPERTY_STATUS.PAUSED;
  }
  if (value === "approved" || value === "published") {
    return PROPERTY_STATUS.ACTIVE;
  }
  if (value === "archived") {
    return PROPERTY_STATUS.PAUSED;
  }
  if (isPropertyStatus(value)) return value;
  return fallback;
}

export function isPublishedPropertyStatus(status: unknown): boolean {
  return status === PROPERTY_STATUS.ACTIVE;
}

export function isUnpublishedPropertyStatus(status: unknown): boolean {
  return toPropertyStatus(status) === PROPERTY_STATUS.PAUSED;
}
