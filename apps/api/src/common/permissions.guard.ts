import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { can } from '@shop/contracts';
import type { RequestWithUser } from './current-user.decorator.js';
import { RequirePermission } from './require-permission.decorator.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const needed = this.reflector.getAllAndOverride(RequirePermission, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!needed) return true;

    const user = context.switchToHttp().getRequest<RequestWithUser>().user;

    if (!user) {
      throw new UnauthorizedException();
    }

    if (!can(user.role, needed)) {
      throw new ForbiddenException();
    }

    return true;
  }
}
