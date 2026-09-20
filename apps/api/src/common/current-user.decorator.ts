import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { SessionUser } from '@shop/contracts';
import type { Request } from 'express';

export interface RequestWithUser extends Request {
  user?: SessionUser;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionUser => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (!request.user) {
      throw new Error('CurrentUser used on a route without JwtAuthGuard');
    }

    return request.user;
  },
);
