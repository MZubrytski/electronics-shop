import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { RequestWithUser } from '../common/current-user.decorator.js';
import { UsersService, toSessionUser } from '../users/users.service.js';
import { TokensService } from './tokens.service.js';

function extractBearer(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, value] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && value ? value : null;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokensService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    const token = extractBearer(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException();
    }

    let userId: string;

    try {
      userId = (await this.tokens.verifyAccessToken(token)).sub;
    } catch {
      throw new UnauthorizedException();
    }

    const user = await this.users.findById(userId);

    if (!user) {
      throw new UnauthorizedException();
    }

    request.user = toSessionUser(user);
    return true;
  }
}
