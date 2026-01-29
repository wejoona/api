export type UserRole = 'user' | 'admin' | 'super_admin';

export interface UserWithRole {
  id: string;
  role: UserRole;
  [key: string]: unknown;
}
