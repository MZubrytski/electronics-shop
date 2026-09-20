import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module.js';
import { RateLimitService } from '../../src/auth/rate-limit.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

export interface TestContext {
  app: INestApplication<App>;
  prisma: PrismaService;
  rateLimits: RateLimitService;
  http: () => request.Agent;
}

export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  await app.init();

  const prisma = app.get(PrismaService);
  const rateLimits = app.get(RateLimitService);

  return {
    app,
    prisma,
    rateLimits,
    http: () => request(app.getHttpServer()),
  };
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;

  if (tables.length === 0) return;

  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
  );
}

export async function resetState(ctx: TestContext): Promise<void> {
  await resetDatabase(ctx.prisma);
  ctx.rateLimits.reset();
}
