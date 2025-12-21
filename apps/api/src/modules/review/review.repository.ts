import { Injectable } from '@nestjs/common';
import { Prisma, type HumanReview, type ReviewDecision, type StepType } from '@prisma/client';
import { PrismaService } from '../_core';

// ============================================================================
// Types
// ============================================================================

export interface ReviewFilters {
  page: number;
  limit: number;
  stepType?: StepType;
  decision?: ReviewDecision;
  startDate?: Date;
  endDate?: Date;
}

export type HumanReviewWithRelations = Prisma.HumanReviewGetPayload<{
  include: {
    pipelineRun: {
      include: {
        book: { select: { id: true; title: true } };
      };
    };
    reviewedByAdmin: { select: { id: true; displayName: true } };
  };
}>;

export interface ReviewStatsAggregation {
  totalReviews: number;
  approvedCount: number;
  rejectedCount: number;
  cancelledCount: number;
  avgReviewTimeMinutes: number;
}

export interface StepTypeStats {
  stepType: StepType;
  count: number;
  approvedCount: number;
  avgTimeMinutes: number;
}

export interface ReviewerStats {
  reviewerId: string;
  reviewerName: string;
  count: number;
  approvedCount: number;
}

// ============================================================================
// Repository
// ============================================================================

@Injectable()
export class ReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    filters: ReviewFilters,
  ): Promise<{ reviews: HumanReviewWithRelations[]; total: number }> {
    const where: Prisma.HumanReviewWhereInput = {};

    if (filters.stepType) {
      where.stepType = filters.stepType;
    }
    if (filters.decision) {
      where.decision = filters.decision;
    }
    if (filters.startDate || filters.endDate) {
      where.reviewedAt = {};
      if (filters.startDate) {
        where.reviewedAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.reviewedAt.lte = filters.endDate;
      }
    }

    const [reviews, total] = await this.prisma.$transaction([
      this.prisma.humanReview.findMany({
        where,
        include: {
          pipelineRun: {
            include: {
              book: { select: { id: true, title: true } },
            },
          },
          reviewedByAdmin: { select: { id: true, displayName: true } },
        },
        orderBy: { reviewedAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.humanReview.count({ where }),
    ]);

    return { reviews, total };
  }

  async getOverviewStats(): Promise<ReviewStatsAggregation> {
    const [counts, avgTime] = await Promise.all([
      this.prisma.humanReview.groupBy({
        by: ['decision'],
        _count: { id: true },
      }),
      this.prisma.$queryRaw<{ avg_minutes: number }[]>`
        SELECT AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at)) / 60) as avg_minutes
        FROM human_reviews
        WHERE reviewed_at IS NOT NULL
      `,
    ]);

    const totalReviews = counts.reduce((sum, c) => sum + c._count.id, 0);
    const approvedCount = counts.find((c) => c.decision === 'APPROVED')?._count.id ?? 0;
    const rejectedCount = counts.find((c) => c.decision === 'REJECTED')?._count.id ?? 0;
    const cancelledCount = counts.find((c) => c.decision === 'CANCEL')?._count.id ?? 0;

    return {
      totalReviews,
      approvedCount,
      rejectedCount,
      cancelledCount,
      avgReviewTimeMinutes: avgTime[0]?.avg_minutes ?? 0,
    };
  }

  async getStatsByStepType(): Promise<StepTypeStats[]> {
    const stats = await this.prisma.$queryRaw<
      { step_type: StepType; count: bigint; approved: bigint; avg_minutes: number }[]
    >`
      SELECT 
        step_type,
        COUNT(*)::bigint as count,
        SUM(CASE WHEN decision = 'APPROVED' THEN 1 ELSE 0 END)::bigint as approved,
        AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at)) / 60) as avg_minutes
      FROM human_reviews
      GROUP BY step_type
    `;

    return stats.map((s) => ({
      stepType: s.step_type,
      count: Number(s.count),
      approvedCount: Number(s.approved),
      avgTimeMinutes: s.avg_minutes ?? 0,
    }));
  }

  async getStatsByReviewer(): Promise<ReviewerStats[]> {
    const stats = await this.prisma.$queryRaw<
      { reviewer_id: string; reviewer_name: string; count: bigint; approved: bigint }[]
    >`
      SELECT 
        hr.reviewed_by as reviewer_id,
        ba.display_name as reviewer_name,
        COUNT(*)::bigint as count,
        SUM(CASE WHEN hr.decision = 'APPROVED' THEN 1 ELSE 0 END)::bigint as approved
      FROM human_reviews hr
      JOIN backoffice_admins ba ON hr.reviewed_by = ba.id
      GROUP BY hr.reviewed_by, ba.display_name
    `;

    return stats.map((s) => ({
      reviewerId: s.reviewer_id,
      reviewerName: s.reviewer_name ?? 'Unknown',
      count: Number(s.count),
      approvedCount: Number(s.approved),
    }));
  }

  async getRecentCounts(): Promise<{ last7Days: number; last30Days: number }> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [last7Days, last30Days] = await Promise.all([
      this.prisma.humanReview.count({
        where: { reviewedAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.humanReview.count({
        where: { reviewedAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    return { last7Days, last30Days };
  }
}

