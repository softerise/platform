import { Injectable, Logger } from '@nestjs/common';
import { PipelineRepository } from '../pipeline/pipeline.repository';
import { ReviewRepository, type ReviewFilters } from './review.repository';
import type {
  PaginatedReviewHistoryDto,
  ReviewHistoryItemDto,
  ReviewStatsDto,
} from './dto/review-history.dto';

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly pipelineRepository: PipelineRepository,
  ) {}

  async getHistory(filters: ReviewFilters): Promise<PaginatedReviewHistoryDto> {
    const { reviews, total } = await this.reviewRepository.findMany(filters);

    const data: ReviewHistoryItemDto[] = await Promise.all(
      reviews.map(async (review) => {
        // Get step execution for summary
        let stepSummary: object | null = null;
        const step = await this.pipelineRepository.findStepByType(
          review.pipelineRunId,
          review.stepType,
        );
        if (step?.outputData && typeof step.outputData === 'object') {
          const outputData = step.outputData as { summary?: object };
          stepSummary = outputData.summary ?? null;
        }

        return {
          id: review.id,
          pipelineRunId: review.pipelineRunId,
          pipelineTitle: review.pipelineRun.book?.title ?? 'Unknown',
          stepType: review.stepType,
          decision: review.decision,
          reviewedBy: review.reviewedBy,
          reviewedByName: review.reviewedByAdmin?.displayName ?? 'Unknown',
          reviewedAt: review.reviewedAt.toISOString(),
          comments: review.comments,
          stepOutput: {
            summary: stepSummary,
          },
        };
      }),
    );

    const totalPages = Math.ceil(total / filters.limit);

    return {
      data,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages,
      },
    };
  }

  async getStats(): Promise<ReviewStatsDto> {
    const [overview, byStepType, byReviewer, recentCounts] = await Promise.all([
      this.reviewRepository.getOverviewStats(),
      this.reviewRepository.getStatsByStepType(),
      this.reviewRepository.getStatsByReviewer(),
      this.reviewRepository.getRecentCounts(),
    ]);

    const approvalRate =
      overview.totalReviews > 0
        ? (overview.approvedCount / overview.totalReviews) * 100
        : 0;

    // Calculate change percent (compare last 7 days to previous 7 days)
    // For simplicity, we'll use a rough estimate
    const avgDailyLast7 = recentCounts.last7Days / 7;
    const avgDailyPrev7 =
      (recentCounts.last30Days - recentCounts.last7Days) / 23; // ~23 remaining days
    const changePercent =
      avgDailyPrev7 > 0
        ? ((avgDailyLast7 - avgDailyPrev7) / avgDailyPrev7) * 100
        : 0;

    return {
      overview: {
        totalReviews: overview.totalReviews,
        approvedCount: overview.approvedCount,
        rejectedCount: overview.rejectedCount,
        cancelledCount: overview.cancelledCount,
        approvalRate: Math.round(approvalRate * 100) / 100,
      },
      avgReviewTimeMinutes: Math.round(overview.avgReviewTimeMinutes * 100) / 100,
      byStepType: byStepType.map((s) => ({
        stepType: s.stepType,
        count: s.count,
        approvalRate:
          s.count > 0
            ? Math.round((s.approvedCount / s.count) * 10000) / 100
            : 0,
        avgTimeMinutes: Math.round(s.avgTimeMinutes * 100) / 100,
      })),
      byReviewer: byReviewer.map((r) => ({
        reviewerId: r.reviewerId,
        reviewerName: r.reviewerName,
        count: r.count,
        approvalRate:
          r.count > 0
            ? Math.round((r.approvedCount / r.count) * 10000) / 100
            : 0,
      })),
      trends: {
        last7Days: recentCounts.last7Days,
        last30Days: recentCounts.last30Days,
        changePercent: Math.round(changePercent * 100) / 100,
      },
    };
  }
}

