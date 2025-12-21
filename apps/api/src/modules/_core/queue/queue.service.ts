import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  async addJob<T>(
    queueName: string,
    jobName: string,
    data: T,
    options?: { delay?: number; attempts?: number },
  ) {
    this.logger.log(`Job ${jobName} queued to ${queueName}`);
    return {
      id: `job-${Date.now()}`,
      name: jobName,
      data,
      options,
    };
  }
}

