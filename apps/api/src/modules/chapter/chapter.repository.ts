import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../_core';

@Injectable()
export class ChapterRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBookWithStatus(bookId: string) {
    return this.prisma.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        isPipelineEligible: true,
        chaptersLocked: true,
      },
    });
  }

  async findChapterWithBook(chapterId: string) {
    return this.prisma.bookChapter.findUnique({
      where: { id: chapterId },
      include: {
        book: {
          select: {
            id: true,
            isPipelineEligible: true,
            chaptersLocked: true,
          },
        },
      },
    });
  }

  async getMaxChapterNumber(bookId: string) {
    const result = await this.prisma.bookChapter.aggregate({
      where: { bookId },
      _max: { chapterNumber: true },
    });
    return result._max.chapterNumber ?? 0;
  }

  async existsChapterNumber(bookId: string, chapterNumber: number) {
    const existing = await this.prisma.bookChapter.findFirst({
      where: { bookId, chapterNumber },
      select: { id: true },
    });
    return !!existing;
  }

  async createChapter(data: {
    bookId: string;
    chapterNumber: number;
    chapterTitle?: string | null;
    content: string;
    wordCount: number;
    createdBy: string;
  }) {
    return this.prisma.bookChapter.create({
      data: {
        bookId: data.bookId,
        chapterNumber: data.chapterNumber,
        chapterTitle: data.chapterTitle,
        content: data.content,
        wordCount: data.wordCount,
        createdBy: data.createdBy,
      },
    });
  }

  async updateChapter(chapterId: string, data: { chapterTitle?: string | null; content?: string; wordCount?: number }) {
    return this.prisma.bookChapter.update({
      where: { id: chapterId },
      data: {
        chapterTitle: data.chapterTitle,
        content: data.content,
        wordCount: data.wordCount,
      },
    });
  }

  async deleteChapter(chapterId: string) {
    return this.prisma.bookChapter.delete({ where: { id: chapterId } });
  }

  async listByBook(bookId: string) {
    const [chapters, aggregate] = await this.prisma.$transaction([
      this.prisma.bookChapter.findMany({
        where: { bookId },
        orderBy: { chapterNumber: 'asc' },
      }),
      this.prisma.bookChapter.aggregate({
        where: { bookId },
        _sum: { wordCount: true },
      }),
    ]);

    return {
      chapters,
      totalChapters: chapters.length,
      totalWordCount: aggregate._sum.wordCount ?? 0,
    };
  }
}

