export type UserRole = "ADMIN" | "MANAGER" | "STAFF";

export interface AppUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  createdAt: string;
}
