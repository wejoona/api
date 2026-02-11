export type UserRole = 'user' | 'admin' | 'super_admin' | 'finance';

export interface UserWithRole {
  id: string;
  role: UserRole;
  [key: string]: unknown;
}
