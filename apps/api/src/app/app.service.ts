import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SearchService } from './search.service';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async getHealth() {
    let db = 'disconnected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = 'ok';
    } catch (error) {
      this.logger.warn(`Prisma healthcheck failed: ${error}`);
    }

    return {
      status: 'ok',
      version: process.env.npm_package_version ?? '0.0.0',
      environment: this.config.get('nodeEnv', { infer: true }) ?? 'development',
      db,
    };
  }

  async summarize(text: string) {
    return this.search.summarize(text);
  }
}
