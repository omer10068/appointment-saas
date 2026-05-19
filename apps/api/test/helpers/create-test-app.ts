import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import type { App } from 'supertest/types';

/**
 * Wraps a compiled TestingModule into an initialized NestJS app with the same
 * ValidationPipe configuration used in production (main.ts).
 *
 * Each e2e test file is responsible for composing its own TestingModule
 * (imports, overrides). This helper only standardizes app setup so tests do
 * not drift from the production pipeline.
 */
export async function createTestApp(
  compiledModule: TestingModule,
): Promise<INestApplication<App>> {
  const app = compiledModule.createNestApplication<INestApplication<App>>();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}
