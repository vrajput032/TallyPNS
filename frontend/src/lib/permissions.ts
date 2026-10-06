import type { AuthUser } from "@/store/authStore";

/** Activity log and editing sales invoices are admin-only. */
export function isAdmin(user: AuthUser | null | undefined): boolean {
  return canDelete(user);
}

export function canDelete(user: AuthUser | null | undefined): boolean {
  if (!user) {
    return false;
  }

  switch (user.role) {
    case "ADMIN":
      return true;
    case "STAFF":
      return false;
    default: {
      const _exhaustive: never = user.role;
      return _exhaustive;
    }
  }
}
