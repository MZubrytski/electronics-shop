import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  AuthResult,
  RefreshInput,
  SessionUser,
  SignInInput,
  SignUpInput,
} from '@shop/contracts';
import { CurrentUser } from '../common/current-user.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RateLimitGuard } from './rate-limit.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('sign-up')
  @UseGuards(RateLimitGuard)
  signUp(
    @Body(new ZodValidationPipe(SignUpInput)) input: SignUpInput,
  ): Promise<AuthResult> {
    return this.auth.signUp(input);
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  signIn(
    @Body(new ZodValidationPipe(SignInInput)) input: SignInInput,
  ): Promise<AuthResult> {
    return this.auth.signIn(input);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  refresh(
    @Body(new ZodValidationPipe(RefreshInput)) input: RefreshInput,
  ): Promise<AuthResult> {
    return this.auth.refresh(input.refreshToken);
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  async signOut(
    @Body(new ZodValidationPipe(RefreshInput)) input: RefreshInput,
  ): Promise<{ ok: true }> {
    await this.auth.signOut(input.refreshToken);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: SessionUser): SessionUser {
    return user;
  }
}
