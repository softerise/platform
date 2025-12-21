import { z } from 'zod';

// ============================================================================
// Pipeline Metrics DTOs
// ============================================================================

export interface PipelineMetricsDto {
  overview: {
    total: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    successRate: number; // percentage
  };
  timing: {
    avgDurationMinutes: number;
    fastestMinutes: number;
    slowestMinutes: number;
  };
  stepStats: StepStatsDto[];
  recentActivity: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
  };
  periodComparison: {
    thisWeek: number;
    lastWeek: number;
    changePercent: number;
  };
}

export interface StepStatsDto {
  stepType: string;
  totalExecutions: number;
  successCount: number;
  failCount: number;
  avgDurationSeconds: number;
  avgRetries: number;
}

// ============================================================================
// Pipeline Timeline DTOs
// ============================================================================

export interface PipelineTimelineDto {
  pipelineId: string;
  bookTitle: string;
  status: string;
  timeline: TimelineEventDto[];
  currentStep: CurrentStepDto | null;
}

export interface TimelineEventDto {
  timestamp: string;
  event: string; // 'CREATED', 'STEP_STARTED', 'STEP_COMPLETED', 'REVIEW_SUBMITTED', etc.
  stepType: string | null;
  episodeNumber: number | null;
  details: {
    status?: string;
    duration?: number;
    retryCount?: number;
    decision?: string;
    error?: string;
  };
}

export interface CurrentStepDto {
  stepType: string;
  status: string;
  startedAt: string;
  progress: string;
}

// ============================================================================
// Step Output DTOs
// ============================================================================

export const GetStepOutputQuerySchema = z.object({
  episodeNumber: z.preprocess(
    (val) => (val === undefined ? undefined : Number(val)),
    z.number().int().positive().optional(),
  ),
});
export type GetStepOutputQueryDto = z.infer<typeof GetStepOutputQuerySchema>;

export interface StepOutputDto {
  stepExecution: {
    id: string;
    stepType: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    durationSeconds: number | null;
    retryCount: number;
    episodeNumber: number | null;
  };
  output: {
    raw: string;
    parsed: object | null;
    summary: object | null;
  } | null;
  prompt: {
    systemPrompt: string;
    userPrompt: string;
  } | null;
}

// ============================================================================
// Bulk Cancel DTOs
// ============================================================================

export const BulkCancelSchema = z.object({
  pipelineIds: z.array(z.string().uuid()).min(1).max(50),
  reason: z.string().max(500).optional(),
});
export type BulkCancelDto = z.infer<typeof BulkCancelSchema>;

export interface BulkCancelResultDto {
  successful: string[];
  failed: { id: string; error: string }[];
  summary: {
    total: number;
    successCount: number;
    failCount: number;
  };
}

// ============================================================================
// Retry Step DTOs
// ============================================================================

export interface RetryStepResultDto {
  stepExecutionId: string;
  stepType: string;
  message: string;
  queuedAt: string;
}

