import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { HealthResponse } from '@shop/contracts';
import { AppModule } from './../src/app.module.js';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers GET /health with 200', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });

  it('answers with a body matching the HealthResponse contract', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    // Throws a readable ZodError when the response drifts from the contract.
    const body = HealthResponse.parse(response.body);

    expect(body.status).toBe('ok');
    expect(body.service).toBe('@shop/api');
  });

  it('needs no authentication: Render probes it without cookies', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .set('Cookie', '')
      .expect(200);
  });
});
