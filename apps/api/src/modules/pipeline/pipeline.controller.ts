import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import {
  CancelPipelineSchema,
  CreatePipelineSchema,
  ListPipelinesQuerySchema,
  SubmitReviewSchema,
  type CancelPipelineDto,
  type CreatePipelineDto,
  type ListPipelinesQueryDto,
  type SubmitReviewDto,
} from './pipeline.dto';
import {
  BulkCancelSchema,
  GetStepOutputQuerySchema,
  type BulkCancelDto,
  type BulkCancelResultDto,
  type GetStepOutputQueryDto,
  type PipelineMetricsDto,
  type PipelineTimelineDto,
  type RetryStepResultDto,
  type StepOutputDto,
} from './dto/pipeline-metrics.dto';
import {
  CurrentUser,
  ZodPipe,
  type CurrentUserData,
} from '../_core';

// TODO: Add proper authentication in production
// @UseGuards(FirebaseAuthGuard, RolesGuard)
// @Roles('SUPER_ADMIN', 'CONTENT_MANAGER')
@Controller('pipelines')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) { }

  // Static routes first
  @Get('metrics')
  async getMetrics(): Promise<PipelineMetricsDto> {
    return this.pipelineService.getMetrics();
  }

  @Get('pending-reviews')
  async getPendingReviews() {
    return this.pipelineService.getPendingReviews();
  }

  @Get()
  async listPipelines(
    @Query(new ZodPipe(ListPipelinesQuerySchema)) query: ListPipelinesQueryDto,
  ) {
    return this.pipelineService.listPipelines(query);
  }

  @Post('bulk-cancel')
  // TODO: @Roles('SUPER_ADMIN') - Add in production
  async bulkCancel(
    @Body(new ZodPipe(BulkCancelSchema)) dto: BulkCancelDto,
  ): Promise<BulkCancelResultDto> {
    return this.pipelineService.bulkCancel(dto.pipelineIds, dto.reason);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async startPipeline(
    @Body(new ZodPipe(CreatePipelineSchema)) dto: CreatePipelineDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.pipelineService.startPipeline(dto, user);
  }

  // Dynamic routes after
  @Get(':id')
  async getPipeline(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.pipelineService.getPipeline(id);
  }

  @Post(':id/cancel')
  async cancelPipeline(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodPipe(CancelPipelineSchema)) dto: CancelPipelineDto,
  ) {
    return this.pipelineService.cancelPipeline(id, dto);
  }

  @Post(':id/resume')
  async resumePipeline(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.pipelineService.resumePipeline(id);
  }

  @Get(':id/steps')
  async getPipelineSteps(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.pipelineService.getPipelineSteps(id);
  }

  @Get(':id/steps/debug')
  async getStepOutputDebug(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.pipelineService.getStepOutputDebug(id);
  }

  @Get(':id/progress')
  async getPipelineProgress(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.pipelineService.getPipelineProgress(id);
  }

  @Post(':id/review')
  async submitReview(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodPipe(SubmitReviewSchema)) dto: SubmitReviewDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.pipelineService.submitReview(id, dto, user);
  }

  @Get(':id/timeline')
  async getTimeline(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<PipelineTimelineDto> {
    return this.pipelineService.getTimeline(id);
  }

  @Get(':id/steps/:stepType/output')
  async getStepOutput(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('stepType') stepType: string,
    @Query(new ZodPipe(GetStepOutputQuerySchema)) query: GetStepOutputQueryDto,
  ): Promise<StepOutputDto> {
    return this.pipelineService.getStepOutput(id, stepType, query.episodeNumber);
  }

  @Post(':id/steps/:stepExecutionId/retry')
  async retryStep(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('stepExecutionId', new ParseUUIDPipe()) stepExecutionId: string,
  ): Promise<RetryStepResultDto> {
    return this.pipelineService.retryStep(id, stepExecutionId);
  }
}


