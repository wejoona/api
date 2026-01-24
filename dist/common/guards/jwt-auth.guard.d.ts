import { ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
export interface JwtUser {
    id: string;
    phone: string;
    [key: string]: unknown;
}
export interface AuthenticatedRequest extends Request {
    user: JwtUser;
}
declare const JwtAuthGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class JwtAuthGuard extends JwtAuthGuard_base {
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | import("rxjs").Observable<boolean>;
    handleRequest<TUser = JwtUser>(err: Error | null, user: TUser | false, _info: {
        message?: string;
    } | undefined): TUser;
}
export {};
