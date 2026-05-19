import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { HealthModule } from '../../src/health/health.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createTestApp } from '../helpers/create-test-app';

// No requireTestDatabase() — PrismaService is fully mocked here.

describe('GET /health', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const mockPrisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = await createTestApp(module);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });

  it('response body contains { status: "ok" }', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });
});
