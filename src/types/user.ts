export type UserRole = "admin" | "user";

export interface SessionUser {
  id: string;
  username: string;
  role: UserRole;
  sessionVersion?: number;
}
