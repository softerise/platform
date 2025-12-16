import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EventType } from '@project/events';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';

@Injectable()
export class NotificationQueue {
  private readonly logger = new Logger(NotificationQueue.name);
  private readonly queue?: Queue;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    const host = config.get('redis.host', { infer: true });
    const port = config.get('redis.port', { infer: true }) ?? 6379;

    if (!host) {
      const message =
        'REDIS_HOST missing, BullMQ cannot start. Please set REDIS_HOST in .env';
      this.logger.error(message);
      throw new Error(message);
    }

    this.queue = new Queue('notifications', {
      connection: { host, port },
    });
    this.logger.log(
      `BullMQ queue initialised at redis://${host}:${port}/notifications`,
    );
  }

  async publish<TPayload extends object>(
    eventName: EventType,
    payload: TPayload,
  ) {
    if (!this.queue) {
      this.logger.warn(`Queue not configured, skipping ${eventName}`);
      return;
    }
    await this.queue.add(eventName, payload);
  }
}

