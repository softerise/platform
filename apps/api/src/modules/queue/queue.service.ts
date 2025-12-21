import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Queue, type Job } from 'bullmq';
import {
  DEFAULT_JOB_OPTIONS,
  EPISODE_JOB_OPTIONS,
  QUEUE_NAMES,
  type StepJobData,
} from './queue.types';
import type {
  QueueStatsDto,
  QueueDetailDto,
  ClearFailedResultDto,
} from './dto/queue-stats.dto';

interface QueueHealthInfo {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.PIPELINE_STEPS)
    private readonly stepsQueue: Queue<StepJobData>,

    @InjectQueue(QUEUE_NAMES.PIPELINE_EPISODES)
    private readonly episodesQueue: Queue<StepJobData>,
  ) {}

  async addStepJob(data: StepJobData): Promise<Job<StepJobData>> {
    const jobId = `${data.pipelineRunId}-${data.stepType}-${Date.now()}`;
    this.logger.log(`Adding step job: ${jobId}`);

    return this.stepsQueue.add(data.stepType, data, {
      ...DEFAULT_JOB_OPTIONS,
      jobId,
    });
  }

  async addEpisodeJob(data: StepJobData): Promise<Job<StepJobData>> {
    const jobId = `${data.pipelineRunId}-${data.stepType}-ep${data.episodeNumber ?? 'na'}-${Date.now()}`;
    this.logger.log(`Adding episode job: ${jobId}`);

    return this.episodesQueue.add(data.stepType, data, {
      ...EPISODE_JOB_OPTIONS,
      jobId,
    });
  }

  async addEpisodeJobsBulk(jobs: StepJobData[]): Promise<Job<StepJobData>[]> {
    this.logger.log(`Adding ${jobs.length} episode jobs in bulk`);

    const bulkJobs = jobs.map((data) => ({
      name: data.stepType,
      data,
      opts: {
        ...EPISODE_JOB_OPTIONS,
        jobId: `${data.pipelineRunId}-${data.stepType}-ep${data.episodeNumber ?? 'na'}-${Date.now()}`,
      },
    }));

    return this.episodesQueue.addBulk(bulkJobs);
  }

  async getQueueHealth(): Promise<{
    steps: QueueHealthInfo;
    episodes: QueueHealthInfo;
  }> {
    return {
      steps: await this.getQueueInfo(this.stepsQueue),
      episodes: await this.getQueueInfo(this.episodesQueue),
    };
  }

  private async getQueueInfo(queue: Queue<StepJobData>): Promise<QueueHealthInfo> {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }

  async pauseQueue(queueName: keyof typeof QUEUE_NAMES): Promise<void> {
    const queue = queueName === 'PIPELINE_STEPS' ? this.stepsQueue : this.episodesQueue;
    await queue.pause();
    this.logger.warn(`Queue ${queueName} paused`);
  }

  async resumeQueue(queueName: keyof typeof QUEUE_NAMES): Promise<void> {
    const queue = queueName === 'PIPELINE_STEPS' ? this.stepsQueue : this.episodesQueue;
    await queue.resume();
    this.logger.log(`Queue ${queueName} resumed`);
  }

  async clearQueue(queueName: keyof typeof QUEUE_NAMES): Promise<void> {
    const queue = queueName === 'PIPELINE_STEPS' ? this.stepsQueue : this.episodesQueue;
    await queue.obliterate({ force: true });
    this.logger.warn(`Queue ${queueName} cleared`);
  }

  // ============================================================================
  // Enhanced Stats
  // ============================================================================

  async getDetailedStats(): Promise<QueueStatsDto> {
    const [stepsStats, episodesStats] = await Promise.all([
      this.getQueueDetailedInfo(this.stepsQueue, 'steps'),
      this.getQueueDetailedInfo(this.episodesQueue, 'episodes'),
    ]);

    // Get Redis connection info from queue client
    const client = await this.stepsQueue.client;
    let memoryUsage = 'unknown';
    let uptime = 0;
    let connected = false;

    try {
      const info = await client.info('memory');
      const serverInfo = await client.info('server');
      
      const memMatch = info.match(/used_memory_human:(\S+)/);
      if (memMatch) {
        memoryUsage = memMatch[1];
      }
      
      const uptimeMatch = serverInfo.match(/uptime_in_seconds:(\d+)/);
      if (uptimeMatch) {
        uptime = parseInt(uptimeMatch[1], 10);
      }
      
      connected = true;
    } catch {
      connected = false;
    }

    return {
      queues: [stepsStats, episodesStats],
      workers: {
        active: 0, // BullMQ doesn't expose worker counts directly
        idle: 0,
      },
      redis: {
        connected,
        memoryUsage,
        uptime,
      },
    };
  }

  private async getQueueDetailedInfo(
    queue: Queue<StepJobData>,
    name: string,
  ): Promise<QueueDetailDto> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    // Get oldest waiting job
    let oldestWaitingJob: string | null = null;
    const waitingJobs = await queue.getWaiting(0, 0);
    if (waitingJobs.length > 0 && waitingJobs[0].timestamp) {
      oldestWaitingJob = new Date(waitingJobs[0].timestamp).toISOString();
    }

    // Calculate simple processing metrics (approximations)
    // In production, you'd use more sophisticated tracking
    const processingRate = active > 0 ? active * 60 : 0; // rough estimate
    const avgProcessingTime = 30; // placeholder, would need job history tracking

    // Determine queue health status
    let status: 'healthy' | 'degraded' | 'down' = 'healthy';
    if (failed > waiting + active) {
      status = 'degraded';
    }
    if (waiting > 100 && active === 0) {
      status = 'down';
    }

    return {
      name,
      status,
      counts: {
        waiting,
        active,
        completed,
        failed,
        delayed,
      },
      metrics: {
        processingRate,
        avgProcessingTime,
        oldestWaitingJob,
      },
    };
  }

  // ============================================================================
  // Queue Control Operations
  // ============================================================================

  async pause(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    await queue.pause();
    this.logger.warn(`Queue ${queueName} paused`);
  }

  async resume(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName);
    await queue.resume();
    this.logger.log(`Queue ${queueName} resumed`);
  }

  async clearFailed(queueName: string): Promise<ClearFailedResultDto> {
    const queue = this.getQueueByName(queueName);
    const failedJobs = await queue.getFailed();
    
    let cleared = 0;
    for (const job of failedJobs) {
      await job.remove();
      cleared++;
    }

    this.logger.warn(`Cleared ${cleared} failed jobs from ${queueName}`);
    
    return {
      cleared,
      queueName,
    };
  }

  async isPaused(queueName: string): Promise<boolean> {
    const queue = this.getQueueByName(queueName);
    return queue.isPaused();
  }

  private getQueueByName(name: string): Queue<StepJobData> {
    if (name === 'steps' || name === QUEUE_NAMES.PIPELINE_STEPS) {
      return this.stepsQueue;
    }
    if (name === 'episodes' || name === QUEUE_NAMES.PIPELINE_EPISODES) {
      return this.episodesQueue;
    }
    throw new BadRequestException({
      code: 'QUEUE-001',
      message: `Invalid queue name: ${name}. Valid names are: steps, episodes`,
    });
  }
}


