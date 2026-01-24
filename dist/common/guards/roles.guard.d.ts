import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
export type UserRole = 'user' | 'admin' | 'super_admin';
export interface UserWithRole {
    id: string;
    role: UserRole;
    [key: string]: unknown;
}
export declare class RolesGuard implements CanActivate {
    private reflector;
    constructor(reflector: Reflector);
    canActivate(context: ExecutionContext): boolean;
    private matchesRole;
}
