// ============================================================================
// Queue Stats DTOs
// ============================================================================

export interface QueueStatsDto {
  queues: QueueDetailDto[];
  workers: {
    active: number;
    idle: number;
  };
  redis: {
    connected: boolean;
    memoryUsage: string;
    uptime: number;
  };
}

export interface QueueDetailDto {
  name: string; // 'steps', 'episodes'
  status: 'healthy' | 'degraded' | 'down';
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
  metrics: {
    processingRate: number; // jobs/minute
    avgProcessingTime: number; // seconds
    oldestWaitingJob: string | null;
  };
}

// ============================================================================
// Queue Operation DTOs
// ============================================================================

export interface QueueOperationResultDto {
  success: boolean;
  message: string;
  queueName: string;
}

export interface ClearFailedResultDto {
  cleared: number;
  queueName: string;
}

