import { Injectable, OnModuleInit } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';

const ARGON2ID = 2;

const OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

@Injectable()
export class PasswordService implements OnModuleInit {
  private dummy = '';

  async onModuleInit(): Promise<void> {
    this.dummy = await this.hash(randomBytes(32).toString('hex'));
  }

  get dummyHash(): string {
    return this.dummy;
  }

  hash(plain: string): Promise<string> {
    return hash(plain, OPTIONS);
  }

  async verify(hashed: string, plain: string): Promise<boolean> {
    try {
      return await verify(hashed, plain, OPTIONS);
    } catch {
      return false;
    }
  }
}
