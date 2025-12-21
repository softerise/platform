import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChapterRepository } from './chapter.repository';
import {
  AddChapterSchema,
  UpdateChapterSchema,
  type AddChapterDto,
  type UpdateChapterDto,
  type ChapterResponse,
  type ChapterUpdateResponse,
  type ChapterListResponse,
} from './chapter.dto';
import type { CurrentUserData } from '../_core';
import { ChapterAddedEvent, ChapterDeletedEvent, ChapterUpdatedEvent } from './chapter.events';

@Injectable()
export class ChapterService {
  private readonly logger = new Logger(ChapterService.name);

  constructor(
    private readonly repository: ChapterRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async addChapter(bookId: string, dto: AddChapterDto, user: CurrentUserData | null): Promise<ChapterResponse> {
    const payload = AddChapterSchema.parse(dto);
    this.ensureUser(user);

    const book = await this.repository.findBookWithStatus(bookId);
    if (!book) {
      throw new NotFoundException({ code: 'BOOK-002', message: 'Book not found' });
    }
    this.ensureBookEligible(book);

    const wordCount = this.calculateWordCount(payload.content);
    this.ensureMinWords(wordCount);

    let chapterNumber = payload.chapterNumber;
    if (!chapterNumber) {
      const maxNumber = await this.repository.getMaxChapterNumber(bookId);
      chapterNumber = maxNumber + 1;
    } else {
      const duplicate = await this.repository.existsChapterNumber(bookId, chapterNumber);
      if (duplicate) {
        throw new ConflictException({ code: 'CHAP-003', message: 'Chapter number already exists' });
      }
    }

    const created = await this.repository.createChapter({
      bookId,
      chapterNumber,
      chapterTitle: payload.chapterTitle,
      content: payload.content,
      wordCount,
      createdBy: user.uid,
    });

    this.eventEmitter.emit(
      'chapter.added',
      new ChapterAddedEvent(created.id, created.bookId, created.chapterNumber),
    );

    return {
      chapterId: created.id,
      bookId: created.bookId,
      chapterNumber: created.chapterNumber,
      chapterTitle: created.chapterTitle,
      wordCount: created.wordCount,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async updateChapter(id: string, dto: UpdateChapterDto): Promise<ChapterUpdateResponse> {
    const payload = UpdateChapterSchema.parse(dto);

    const chapter = await this.repository.findChapterWithBook(id);
    if (!chapter) {
      throw new NotFoundException({ code: 'CHAP-004', message: 'Chapter not found' });
    }

    this.ensureBookEligible(chapter.book);

    let wordCount = chapter.wordCount;
    if (payload.content !== undefined) {
      wordCount = this.calculateWordCount(payload.content);
      this.ensureMinWords(wordCount);
    }

    const updated = await this.repository.updateChapter(id, {
      chapterTitle: payload.chapterTitle ?? chapter.chapterTitle,
      content: payload.content ?? chapter.content,
      wordCount,
    });

    this.eventEmitter.emit(
      'chapter.updated',
      new ChapterUpdatedEvent(updated.id, updated.bookId, updated.chapterNumber),
    );

    return {
      chapterId: updated.id,
      chapterNumber: updated.chapterNumber,
      chapterTitle: updated.chapterTitle,
      wordCount: updated.wordCount,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deleteChapter(id: string) {
    const chapter = await this.repository.findChapterWithBook(id);
    if (!chapter) {
      throw new NotFoundException({ code: 'CHAP-004', message: 'Chapter not found' });
    }

    this.ensureBookEligible(chapter.book);

    const deleted = await this.repository.deleteChapter(id);

    this.eventEmitter.emit(
      'chapter.deleted',
      new ChapterDeletedEvent(deleted.id, deleted.bookId),
    );

    return { success: true, message: 'Chapter deleted' };
  }

  async listChapters(bookId: string): Promise<ChapterListResponse> {
    const book = await this.repository.findBookWithStatus(bookId);
    if (!book) {
      throw new NotFoundException({ code: 'BOOK-002', message: 'Book not found' });
    }

    const { chapters, totalChapters, totalWordCount } = await this.repository.listByBook(bookId);

    return {
      bookId,
      chapters: chapters.map((ch) => ({
        id: ch.id,
        chapterNumber: ch.chapterNumber,
        chapterTitle: ch.chapterTitle,
        wordCount: ch.wordCount,
        createdAt: ch.createdAt.toISOString(),
      })),
      totalChapters,
      totalWordCount,
    };
  }

  async getChapter(bookId: string, chapterId: string): Promise<ChapterResponse> {
    const chapter = await this.repository.findChapterWithBook(chapterId);
    if (!chapter || chapter.bookId !== bookId) {
      throw new NotFoundException({ code: 'CHAP-004', message: 'Chapter not found' });
    }

    return {
      chapterId: chapter.id,
      bookId: chapter.bookId,
      chapterNumber: chapter.chapterNumber,
      chapterTitle: chapter.chapterTitle,
      wordCount: chapter.wordCount,
      createdAt: chapter.createdAt.toISOString(),
    };
  }

  private ensureBookEligible(book: { isPipelineEligible: boolean; chaptersLocked: boolean }) {
    if (book.chaptersLocked) {
      throw new BadRequestException({ code: 'CHAP-001', message: 'Chapters are locked' });
    }
    if (!book.isPipelineEligible) {
      throw new BadRequestException({ code: 'BOOK-003', message: 'Book not eligible' });
    }
  }

  private ensureMinWords(wordCount: number) {
    if (wordCount < 500) {
      throw new BadRequestException({ code: 'CHAP-002', message: 'Chapter content must be at least 500 words' });
    }
  }

  private ensureUser(user: CurrentUserData | null) {
    if (!user?.uid) {
      throw new BadRequestException({ code: 'AUTH-001', message: 'Authentication required' });
    }
  }

  private calculateWordCount(content: string): number {
    return content
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }
}

