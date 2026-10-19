import type { AuthUser } from "@/store/authStore";

/** Activity log, users, recycle bin, and editing sales invoices are admin-only. */
export function isAdmin(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  switch (user.role) {
    case "ADMIN":
      return true;
    case "MANAGER":
    case "STAFF":
      return false;
    default: {
      const _exhaustive: never = user.role;
      return _exhaustive;
    }
  }
}

/** Soft-delete customers, products, sales, raw material, etc. — admin only. */
export function canDelete(user: AuthUser | null | undefined): boolean {
  return isAdmin(user);
}

/**
 * Soft-delete purchase bills, attachments, and running-cost rows (still needs PIN).
 * Admin and Manager.
 */
export function canDeletePurchase(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  switch (user.role) {
    case "ADMIN":
    case "MANAGER":
      return true;
    case "STAFF":
      return false;
    default: {
      const _exhaustive: never = user.role;
      return _exhaustive;
    }
  }
}
