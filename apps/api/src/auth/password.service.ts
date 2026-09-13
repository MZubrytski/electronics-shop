import { Injectable, OnModuleInit } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';

/**
 * Argon2id, with the OWASP baseline spelled out rather than left to the
 * library's defaults: defaults drift between versions, and a silent drop in
 * cost is exactly the kind of change nobody notices.
 *
 * Before deploying, measure these on the target hardware — parameters that
 * feel instant on a laptop can take seconds on half a shared core.
 */
const OPTIONS = {
  // Algorithm.Argon2id. Written as a number because the enum is an ambient
  // const enum, which `isolatedModules` forbids importing as a value.
  algorithm: 2,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

@Injectable()
export class PasswordService implements OnModuleInit {
  /**
   * A real digest of a value nobody knows.
   *
   * Sign-in verifies against this when the address is unknown, so an unknown
   * address costs the same as a real one. It has to be a genuine argon2
   * digest: a made-up string would fail to parse in microseconds and leak the
   * very difference it exists to hide.
   */
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
      // A stored value that is not a valid argon2 digest is a failed check,
      // not a server error.
      return false;
    }
  }
}
