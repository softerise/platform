import { Module, forwardRef } from '@nestjs/common';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { CourseRepository } from './course.repository';
import { FirebaseAuthGuard, RolesGuard } from '../_core';
import { PipelineModule } from '../pipeline/pipeline.module';

@Module({
  imports: [forwardRef(() => PipelineModule)],
  controllers: [CourseController],
  providers: [CourseService, CourseRepository, FirebaseAuthGuard, RolesGuard],
  exports: [CourseService, CourseRepository],
})
export class CourseModule {}

