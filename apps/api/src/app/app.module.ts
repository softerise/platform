import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CoreModule } from '../modules/_core';
import { AuthModule } from '../modules/auth/auth.module';
import { LlmModule } from '../modules/llm/llm.module';
import { BookModule } from '../modules/book/book.module';
import { ChapterModule } from '../modules/chapter/chapter.module';
import { PipelineModule } from '../modules/pipeline/pipeline.module';
import { QueueModule } from '../modules/queue/queue.module';
import { CourseModule } from '../modules/course/course.module';
import { ReviewModule } from '../modules/review/review.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SearchService } from './search.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    CoreModule,
    AuthModule,
    LlmModule,
    BookModule,
    ChapterModule,
    PipelineModule,
    QueueModule,
    CourseModule,
    ReviewModule,
  ],
  controllers: [AppController],
  providers: [AppService, SearchService],
})
export class AppModule {}
