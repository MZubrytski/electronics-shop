import { Controller, Get } from '@nestjs/common';
import { AccessProbe, ROLE_PERMISSIONS, SessionUser } from '@shop/contracts';
import { Auth } from '../common/auth.decorator.js';
import { CurrentUser } from '../common/current-user.decorator.js';

function probe(user: SessionUser): AccessProbe {
  return {
    ok: true,
    role: user.role,
    permissions: [...ROLE_PERMISSIONS[user.role]],
  };
}

@Controller('admin')
export class AdminController {
  @Get('probe')
  @Auth('dashboard:read')
  managerProbe(@CurrentUser() user: SessionUser): AccessProbe {
    return probe(user);
  }

  @Get('probe/owner')
  @Auth('user:manage')
  ownerProbe(@CurrentUser() user: SessionUser): AccessProbe {
    return probe(user);
  }
}
