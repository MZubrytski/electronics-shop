import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { PasswordService } from './password.service.js';
import { RateLimitGuard, RateLimitService } from './rate-limit.guard.js';
import { TokensService } from './tokens.service.js';

@Module({
  imports: [JwtModule.register({}), UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokensService,
    JwtAuthGuard,
    RateLimitGuard,
    RateLimitService,
  ],
  exports: [JwtAuthGuard, TokensService, RateLimitService],
})
export class AuthModule {}
