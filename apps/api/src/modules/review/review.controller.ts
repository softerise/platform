import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard, Roles, RolesGuard, ZodPipe } from '../_core';
import { ReviewService } from './review.service';
import {
  ReviewHistoryQuerySchema,
  type ReviewHistoryQueryDto,
  type PaginatedReviewHistoryDto,
  type ReviewStatsDto,
} from './dto/review-history.dto';
import type { ReviewFilters } from './review.repository';

@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'CONTENT_MANAGER')
@Controller('api/v1/reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  async getHistory(
    @Query(new ZodPipe(ReviewHistoryQuerySchema)) query: ReviewHistoryQueryDto,
  ): Promise<PaginatedReviewHistoryDto> {
    const filters: ReviewFilters = {
      page: query.page,
      limit: query.limit,
      stepType: query.stepType,
      decision: query.decision,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };
    return this.reviewService.getHistory(filters);
  }

  @Get('stats')
  async getStats(): Promise<ReviewStatsDto> {
    return this.reviewService.getStats();
  }
}

