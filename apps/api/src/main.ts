/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:4173',
      'http://localhost:5173',
      'http://localhost:4200',
      'http://localhost:4300',
      'http://localhost:4321',
    ],
    credentials: true,
  });
  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(
    `🚀 API running at http://localhost:${port}/${globalPrefix} (NODE_ENV=${process.env.NODE_ENV ?? 'development'})`,
  );
}

bootstrap();
