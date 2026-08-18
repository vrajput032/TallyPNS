export type UserRole = "ADMIN" | "STAFF";

export interface AppUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  createdAt: string;
}
