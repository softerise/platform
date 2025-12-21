import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { BookController } from './book.controller';
import { BookService } from './book.service';
import { BookRepository } from './book.repository';
import { FirebaseAuthGuard, RolesGuard } from '../_core';

@Module({
  imports: [LlmModule],
  controllers: [BookController],
  providers: [BookService, BookRepository, RolesGuard, FirebaseAuthGuard],
  exports: [BookService],
})
export class BookModule {}

