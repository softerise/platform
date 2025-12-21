import { PipelineStatus, StepStatus, StepType } from '@prisma/client';
import { z } from 'zod';

export const PipelineStatusEnum = z.nativeEnum(PipelineStatus);
export const StepTypeEnum = z.nativeEnum(StepType);
export const StepStatusEnum = z.nativeEnum(StepStatus);
export const ReviewDecisionEnum = z.enum(['APPROVED', 'REJECTED', 'CANCEL']);

const statusListPreprocess = z.preprocess((value) => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return value;
}, z.array(PipelineStatusEnum).optional());

export const CreatePipelineSchema = z.object({
  bookId: z.string().uuid({ message: 'bookId must be a valid UUID' }),
});
export type CreatePipelineDto = z.infer<typeof CreatePipelineSchema>;

export const CancelPipelineSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
});
export type CancelPipelineDto = z.infer<typeof CancelPipelineSchema>;

export const ListPipelinesQuerySchema = z.object({
  status: statusListPreprocess,
  bookId: z.string().uuid().optional(),
  page: z.preprocess(
    (val) => (val === undefined ? 1 : Number(val)),
    z.number().int().positive().default(1),
  ),
  pageSize: z.preprocess(
    (val) => (val === undefined ? 20 : Number(val)),
    z.number().int().min(1).max(100).default(20),
  ),
});
export type ListPipelinesQueryDto = z.infer<typeof ListPipelinesQuerySchema>;

export const SubmitReviewSchema = z.object({
  stepType: StepTypeEnum,
  decision: ReviewDecisionEnum,
  comments: z.string().max(1000).optional(),
  selectedIdeaId: z.string().optional(),
});
export type SubmitReviewDto = z.infer<typeof SubmitReviewSchema>;

export interface PipelineResponseDto {
  id: string;
  bookId: string;
  bookTitle: string;
  status: PipelineStatus;
  currentStep: StepType | null;
  currentStepNumber: number | null;
  progress: number;
  revisionCount: number;
  startedAt: string | null;
  completedAt: string | null;
  initiatedBy: { id: string; displayName: string };
  errorMessage: string | null;
}

export interface PipelineSummaryDto {
  id: string;
  bookId: string;
  bookTitle: string;
  status: PipelineStatus;
  progress: number;
  currentStep: StepType | null;
  startedAt: string | null;
}

export interface StepSummaryDto {
  id: string;
  stepType: StepType;
  stepNumber: number;
  status: StepStatus;
  episodeNumber: number | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  retryCount: number;
}

export interface PipelineProgressDto {
  pipelineRunId: string;
  status: PipelineStatus;
  progress: number;
  currentStep: StepType | null;
  currentStepProgress: string;
  estimatedRemainingMinutes: number | null;
}

export interface PipelineListResponse {
  pipelines: PipelineSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
}


