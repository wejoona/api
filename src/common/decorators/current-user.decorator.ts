import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom decorator to extract the current authenticated user from the request.
 * The user is attached to the request by the JwtStrategy.
 *
 * Usage:
 * - @CurrentUser() user: User - Get the entire user object
 * - @CurrentUser('id') userId: string - Get a specific property from the user
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
