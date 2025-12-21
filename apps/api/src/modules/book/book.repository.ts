import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../_core';

interface CreateBookInput {
  title: string;
  description: string;
  bookLink?: string;
  language: string;
  createdBy: string;
  s1Verdict: string;
  s1Score: number | null;
  s1VerdictConfidence: string;
  s1PrimarySpiId?: string | null;
  s1PrimarySpiName?: string | null;
  isPipelineEligible: boolean;
  s1Output: Prisma.JsonValue;
  evaluatedAt: Date;
}

interface ListParams {
  verdict?: string;
  isPipelineEligible?: boolean;
  search?: string;
  page: number;
  pageSize: number;
}

@Injectable()
export class BookRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTitleInsensitive(title: string) {
    return this.prisma.book.findFirst({
      where: { title: { equals: title, mode: 'insensitive' } },
    });
  }

  async createBook(data: CreateBookInput) {
    return this.prisma.book.create({
      data: {
        title: data.title,
        description: data.description,
        bookLink: data.bookLink,
        language: data.language,
        createdBy: data.createdBy,
        s1Verdict: data.s1Verdict as Prisma.S1Verdict,
        s1Score: data.s1Score,
        s1VerdictConfidence: data.s1VerdictConfidence as Prisma.S1VerdictConfidence,
        s1PrimarySpiId: data.s1PrimarySpiId,
        s1PrimarySpiName: data.s1PrimarySpiName,
        isPipelineEligible: data.isPipelineEligible,
        s1Output: data.s1Output,
        evaluatedAt: data.evaluatedAt,
      },
    });
  }

  async getBookById(id: string) {
    const [book, wordSum] = await this.prisma.$transaction([
      this.prisma.book.findUnique({
        where: { id },
        include: {
          pipelineRun: true,
          createdByAdmin: { select: { id: true, displayName: true } },
          _count: { select: { chapters: true } },
        },
      }),
      this.prisma.bookChapter.aggregate({
        where: { bookId: id },
        _sum: { wordCount: true },
      }),
    ]);

    if (!book) return null;

    const totalWordCount = wordSum._sum.wordCount ?? 0;

    return {
      book,
      totalChapters: book._count.chapters,
      totalWordCount,
      pipelineStatus: book.pipelineRun?.status ?? null,
    };
  }

  async listBooks(params: ListParams) {
    const where: Prisma.BookWhereInput = {};
    if (params.verdict) {
      where.s1Verdict = params.verdict as Prisma.S1Verdict;
    }
    if (params.isPipelineEligible !== undefined) {
      where.isPipelineEligible = params.isPipelineEligible;
    }
    if (params.search) {
      where.title = { contains: params.search, mode: 'insensitive' };
    }

    const [total, books] = await this.prisma.$transaction([
      this.prisma.book.count({ where }),
      this.prisma.book.findMany({
        where,
        include: { pipelineRun: true },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]);

    return { total, books };
  }
}

