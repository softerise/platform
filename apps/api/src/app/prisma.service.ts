import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url =
      process.env.DATABASE_URL ??
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

