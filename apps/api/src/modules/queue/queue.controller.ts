import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { QueueService } from './queue.service';
import { FirebaseAuthGuard, Roles, RolesGuard } from '../_core';
import type {
  QueueStatsDto,
  ClearFailedResultDto,
  QueueOperationResultDto,
} from './dto/queue-stats.dto';

@UseGuards(FirebaseAuthGuard, RolesGuard)
@Controller('api/v1/queues')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get('health')
  @Roles('SUPER_ADMIN')
  async getQueueHealth() {
    return this.queueService.getQueueHealth();
  }

  @Get('stats')
  @Roles('SUPER_ADMIN')
  async getStats(): Promise<QueueStatsDto> {
    return this.queueService.getDetailedStats();
  }

  @Post(':queueName/pause')
  @Roles('SUPER_ADMIN')
  async pauseQueue(
    @Param('queueName') queueName: string,
  ): Promise<QueueOperationResultDto> {
    await this.queueService.pause(queueName);
    return {
      success: true,
      message: `Queue ${queueName} paused`,
      queueName,
    };
  }

  @Post(':queueName/resume')
  @Roles('SUPER_ADMIN')
  async resumeQueue(
    @Param('queueName') queueName: string,
  ): Promise<QueueOperationResultDto> {
    await this.queueService.resume(queueName);
    return {
      success: true,
      message: `Queue ${queueName} resumed`,
      queueName,
    };
  }

  @Delete(':queueName/failed')
  @Roles('SUPER_ADMIN')
  async clearFailed(
    @Param('queueName') queueName: string,
  ): Promise<ClearFailedResultDto> {
    return this.queueService.clearFailed(queueName);
  }
}


