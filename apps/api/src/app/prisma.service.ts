import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    const url =
      config.get('database.url', { infer: true }) ??
      'file:./packages/db-schema/prisma/dev.db'.replace(/^file:/, 'file:');
    super({
      datasources: {
        db: { url },
      },
      log: ['warn', 'error'],
    });
    this.logger.log(`Prisma datasource: ${url}`);
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma connected');
    } catch (error) {
      this.logger.warn(`Prisma connection skipped: ${error}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

