import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { PipelineController } from './pipeline.controller';
import { PipelineService } from './pipeline.service';
import { PipelineRepository } from './pipeline.repository';
import { FirebaseAuthGuard, RolesGuard } from '../_core';
import { QueueModule } from '../queue/queue.module';
import { StepExecutionService } from './step-execution.service';
import { StepExecutor } from './step-executor';
import { CheckpointService } from './checkpoint.service';
import { LlmModule } from '../llm/llm.module';
import { PipelineOrchestratorService } from './pipeline-orchestrator.service';
import { StepProcessor } from './processors/step.processor';
import { EpisodeProcessor } from './processors/episode.processor';
import { S2IdeaInspirationHandler } from './step-handlers/s2-idea-inspiration.handler';
import { S3CourseOutlineHandler } from './step-handlers/s3-course-outline.handler';
import { S4EpisodeDraftHandler } from './step-handlers/s4-episode-draft.handler';
import { S5EpisodeContentHandler } from './step-handlers/s5-episode-content.handler';
import { S6PracticeContentHandler } from './step-handlers/s6-practice-content.handler';
import { S7FinalEvaluationHandler } from './step-handlers/s7-final-evaluation.handler';
import { CourseModule } from '../course/course.module';

@Module({
  imports: [QueueModule, LlmModule, forwardRef(() => CourseModule)],
  controllers: [PipelineController],
  providers: [
    PipelineService,
    PipelineRepository,
    StepExecutionService,
    StepExecutor,
    CheckpointService,
    PipelineOrchestratorService,
    StepProcessor,
    EpisodeProcessor,
    FirebaseAuthGuard,
    RolesGuard,
    S2IdeaInspirationHandler,
    S3CourseOutlineHandler,
    S4EpisodeDraftHandler,
    S5EpisodeContentHandler,
    S6PracticeContentHandler,
    S7FinalEvaluationHandler,
  ],
  exports: [PipelineService, PipelineRepository],
})
export class PipelineModule implements OnModuleInit {
  constructor(
    private readonly stepExecutor: StepExecutor,
    private readonly s2Handler: S2IdeaInspirationHandler,
    private readonly s3Handler: S3CourseOutlineHandler,
    private readonly s4Handler: S4EpisodeDraftHandler,
    private readonly s5Handler: S5EpisodeContentHandler,
    private readonly s6Handler: S6PracticeContentHandler,
    private readonly s7Handler: S7FinalEvaluationHandler,
  ) {}

  onModuleInit() {
    this.stepExecutor.registerHandler(this.s2Handler);
    this.stepExecutor.registerHandler(this.s3Handler);
    this.stepExecutor.registerHandler(this.s4Handler);
    this.stepExecutor.registerHandler(this.s5Handler);
    this.stepExecutor.registerHandler(this.s6Handler);
    this.stepExecutor.registerHandler(this.s7Handler);
  }
}


