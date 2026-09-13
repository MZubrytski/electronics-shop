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

    // The token arrives in a header: cookies belong to the storefront, which
    // owns the origin the browser talks to. See docs/features/F1-auth.md.
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

    // Read the person every request. Costs one indexed lookup and buys two
    // things: a deleted account stops working immediately, and the role can
    // never be stale.
    const user = await this.users.findById(userId);

    if (!user) {
      throw new UnauthorizedException();
    }

    request.user = toSessionUser(user);
    return true;
  }
}
