/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app/app.module';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  const config = app.get(ConfigService<AppConfig, true>);
  const nodeEnv = config.get('nodeEnv', { infer: true });
  app.useLogger(logger);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const corsOrigins = config.get('cors.origins', { infer: true });
  app.enableCors({
    origin: corsOrigins?.length ? corsOrigins : true,
    credentials: true,
  });

  // Expose minimal root/health endpoints without /api prefix for load balancer checks
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/', (_req, res) =>
    res.json({ status: 'ok', service: 'api', path: '/', prefix: '/api' }),
  );
  expressApp.get('/health', (_req, res) =>
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
