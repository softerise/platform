import { Module } from '@nestjs/common';
import { ChapterController } from './chapter.controller';
import { ChapterService } from './chapter.service';
import { ChapterRepository } from './chapter.repository';
import { FirebaseAuthGuard, RolesGuard } from '../_core';

@Module({
  imports: [],
  controllers: [ChapterController],
  providers: [ChapterService, ChapterRepository, FirebaseAuthGuard, RolesGuard],
  exports: [ChapterService],
})
export class ChapterModule {}

