import { z } from 'zod';
import { StepType, ReviewDecision } from '@prisma/client';

// ============================================================================
// Query DTOs
// ============================================================================

export const ReviewHistoryQuerySchema = z.object({
  page: z.preprocess(
    (val) => (val === undefined ? 1 : Number(val)),
    z.number().int().positive().default(1),
  ),
  limit: z.preprocess(
    (val) => (val === undefined ? 20 : Number(val)),
    z.number().int().min(1).max(100).default(20),
  ),
  stepType: z.nativeEnum(StepType).optional(),
  decision: z.nativeEnum(ReviewDecision).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
export type ReviewHistoryQueryDto = z.infer<typeof ReviewHistoryQuerySchema>;

// ============================================================================
// Response DTOs
// ============================================================================

export interface ReviewHistoryItemDto {
  id: string;
  pipelineRunId: string;
  pipelineTitle: string;
  stepType: string;
  decision: string;
  reviewedBy: string;
  reviewedByName: string;
  reviewedAt: string;
  comments: string | null;
  stepOutput: {
    summary: object | null;
  };
}

export interface PaginatedReviewHistoryDto {
  data: ReviewHistoryItemDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// Review Stats DTOs
// ============================================================================

export interface ReviewStatsDto {
  overview: {
    totalReviews: number;
    approvedCount: number;
    rejectedCount: number;
    cancelledCount: number;
    approvalRate: number;
  };
  avgReviewTimeMinutes: number;
  byStepType: {
    stepType: string;
    count: number;
    approvalRate: number;
    avgTimeMinutes: number;
  }[];
  byReviewer: {
    reviewerId: string;
    reviewerName: string;
    count: number;
    approvalRate: number;
  }[];
  trends: {
    last7Days: number;
    last30Days: number;
    changePercent: number;
  };
}

