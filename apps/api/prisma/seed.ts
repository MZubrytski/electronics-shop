import 'dotenv/config';
import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PASSWORD_HASH_OPTIONS } from '../src/auth/password.service.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

const DEMO_PASSWORD = 'demo1234';

const ACCOUNTS = [
  { email: 'customer@demo.shop', name: 'Demo Customer', role: 'user' },
  { email: 'manager@demo.shop', name: 'Demo Manager', role: 'admin' },
  { email: 'owner@demo.shop', name: 'Demo Owner', role: 'super_admin' },
] as const;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const passwordHash = await hash(DEMO_PASSWORD, PASSWORD_HASH_OPTIONS);

for (const account of ACCOUNTS) {
  await prisma.user.upsert({
    where: { email: account.email },
    create: { ...account, passwordHash },
    update: { name: account.name, role: account.role, passwordHash },
  });
}

console.log(
  `Demo accounts ready (password ${DEMO_PASSWORD}):\n` +
    ACCOUNTS.map((a) => `  ${a.role.padEnd(11)} ${a.email}`).join('\n'),
);

await prisma.$disconnect();
