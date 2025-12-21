/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppModule } from './app/app.module';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './config/configuration';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = new Logger('Bootstrap');
  const config = app.get(ConfigService<AppConfig, true>);
  const nodeEnv = config.get<string>('nodeEnv' as any, { infer: true });
  app.useLogger(logger);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const corsOrigins = config.get<string[] | string>('cors.origins' as any, { infer: true });
  const origin =
    Array.isArray(corsOrigins) && corsOrigins.length > 0
      ? corsOrigins
      : corsOrigins ?? true;
  app.enableCors({
    origin,
    credentials: true,
  });

  // Swagger (only in non-prod or when explicitly enabled)
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    setupSwagger(app);
    logger.log('📚 Swagger documentation available at /api/docs');
  }

  // Expose minimal root/health endpoints without /api prefix for load balancer checks
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/', (_req: Request, res: Response) =>
    res.json({ status: 'ok', service: 'api', path: '/', prefix: '/api' }),
  );
  expressApp.get('/health', (_req: Request, res: Response) =>
    res.json({
      status: 'ok',
      service: 'api',
      path: '/health',
      details: {
        version: process.env.npm_package_version ?? '0.0.0',
        env: nodeEnv ?? 'development',
      },
    }),
  );

  const port = config.get('port', { infer: true }) ?? 3000;
  await app.listen(port);
  logger.log(
    `🚀 API running at http://localhost:${port}/${globalPrefix} (NODE_ENV=${nodeEnv ?? 'development'})`,
  );
}

bootstrap();
