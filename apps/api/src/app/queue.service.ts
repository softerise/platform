import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EventType } from '@project/events';

@Injectable()
export class NotificationQueue {
  private readonly logger = new Logger(NotificationQueue.name);
  private readonly queue?: Queue;

  constructor() {
    const host = process.env.REDIS_HOST;
    const port = Number(process.env.REDIS_PORT ?? 6379);

    if (host) {
      this.queue = new Queue('notifications', {
        connection: { host, port },
      });
      this.logger.log(
        `BullMQ queue initialised at redis://${host}:${port}/notifications`,
      );
    } else {
      this.logger.warn(
        'REDIS_HOST missing, BullMQ disabled. Jobs will be logged only.',
      );
    }
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

