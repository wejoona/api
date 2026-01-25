import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOWED_STATES_KEY } from './fsm.decorators';

/**
 * FSM Transition Guard
 *
 * Validates that the current entity state allows the requested action.
 * Use with @AllowedStates() decorator on controller methods.
 */
@Injectable()
export class FsmTransitionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedStates = this.reflector.get<string[]>(
      ALLOWED_STATES_KEY,
      context.getHandler(),
    );

    // No state restriction defined
    if (!allowedStates || allowedStates.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Get current state from request (set by middleware or previous guard)
    const currentState = request.entityState || request.body?.currentState;

    if (!currentState) {
      // No state to validate - let the service handle it
      return true;
    }

    if (!allowedStates.includes(currentState)) {
      throw new BadRequestException(
        `Cannot perform this action when status is '${currentState}'. ` +
          `Allowed states: ${allowedStates.join(', ')}`,
      );
    }

    return true;
  }
}
