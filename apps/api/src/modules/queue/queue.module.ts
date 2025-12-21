import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { QUEUE_NAMES } from './queue.types';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string | undefined>('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 500,
        },
        // S3 ve uzun LLM işlemleri için lock yenileme ve stall tespiti süreleri artırıldı.
        sharedWorkerOptions: {
          lockDuration: 600_000, // 10 dakika
          lockRenewTime: 150_000, // 2.5 dakika
          stalledInterval: 300_000, // 5 dakika
          maxStalledCount: 2, // Stall tespiti sonrası en fazla 2 kez yeniden denenir
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.PIPELINE_STEPS },
      { name: QUEUE_NAMES.PIPELINE_EPISODES },
    ),
  ],
  controllers: [QueueController],
  providers: [QueueService],
  exports: [QueueService, BullModule],
})
export class QueueModule { }


