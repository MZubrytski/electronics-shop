import { Reflector } from '@nestjs/core';
import type { Permission } from '@shop/contracts';

export const RequirePermission = Reflector.createDecorator<Permission>();
