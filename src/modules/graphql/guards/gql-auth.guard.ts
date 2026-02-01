import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

/**
 * GraphQL Auth Guard
 * Adapts JWT auth guard for GraphQL context
 */
@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  /**
   * Extract request from GraphQL context
   */
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}
