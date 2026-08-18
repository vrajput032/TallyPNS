import type { AuthUser } from "@/store/authStore";

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
