import { Test } from '@nestjs/testing';
import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  let passwords: PasswordService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    await moduleRef.init();
    passwords = moduleRef.get(PasswordService);
  });

  it('produces an argon2id digest, not the password', async () => {
    const digest = await passwords.hash('correct horse battery staple');

    expect(digest.startsWith('$argon2id$')).toBe(true);
    expect(digest).not.toContain('correct horse');
  });

  it('salts: the same password twice gives different digests', async () => {
    const [first, second] = await Promise.all([
      passwords.hash('same-password'),
      passwords.hash('same-password'),
    ]);

    expect(first).not.toBe(second);
  });

  it('accepts the right password and rejects the wrong one', async () => {
    const digest = await passwords.hash('right-password');

    expect(await passwords.verify(digest, 'right-password')).toBe(true);
    expect(await passwords.verify(digest, 'wrong-password')).toBe(false);
  });

  it('treats a stored value that is not a digest as a failed check', async () => {
    expect(await passwords.verify('not-a-digest', 'anything')).toBe(false);
  });

  it('keeps a real digest as the dummy, so an unknown address costs the same', async () => {
    expect(passwords.dummyHash.startsWith('$argon2id$')).toBe(true);
    expect(await passwords.verify(passwords.dummyHash, 'anything')).toBe(false);
  });
});
