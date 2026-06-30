/** Returns true when the profile role is admin. */
export function isAdminRole(role?: string | null): boolean {
  return role === "admin";
}
