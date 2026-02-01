import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Roles } from '../decorators/roles.decorator';

export type UserRole =
  | 'user'
  | 'admin'
  | 'super_admin'
  | 'compliance_officer'
  | 'compliance_manager';
export { Roles };

export interface UserWithRole {
  id: string;
  role: UserRole;
  [key: string]: unknown;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as UserWithRole | undefined;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasRole = requiredRoles.some((role) =>
      this.matchesRole(user.role, role),
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }

  private matchesRole(userRole: UserRole, requiredRole: UserRole): boolean {
    // super_admin has access to everything
    if (userRole === 'super_admin') return true;
    // admin has access to admin and user roles
    if (userRole === 'admin' && requiredRole !== 'super_admin') return true;
    // exact match
    return userRole === requiredRole;
  }
}
