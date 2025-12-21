import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BookRepository } from './book.repository';
import {
  ListBooksQuerySchema,
  RegisterBookSchema,
  type ListBooksQueryDto,
  type RegisterBookDto,
  type RegisterBookResponse,
  S1EvaluationSchema,
  type BookDetailResponse,
  type ListBooksResponse,
} from './book.dto';
import { LlmService } from '../llm/llm.service';
import { buildS1EvaluationUserPrompt, S1_EVALUATION_SYSTEM_PROMPT } from './prompts/s1-evaluation.prompt';
import type { CurrentUserData } from '../_core';
import { BookEvaluatedEvent, BookRegisteredEvent } from './book.events';
import { LlmError } from '../llm/llm.dto';

@Injectable()
export class BookService {
  private readonly logger = new Logger(BookService.name);

  constructor(
    private readonly repository: BookRepository,
    private readonly llmService: LlmService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async registerBook(dto: RegisterBookDto, user: CurrentUserData | null): Promise<RegisterBookResponse> {
    const payload = RegisterBookSchema.parse(dto);

    if (!user?.uid) {
      throw new BadRequestException({ code: 'BOOK-004', message: 'Missing user context' });
    }

    if (payload.description.trim().length < 100) {
      throw new BadRequestException({
        code: 'BOOK-004',
        message: 'Description must be at least 100 characters',
      });
    }

    const duplicate = await this.repository.findByTitleInsensitive(payload.title);
    if (duplicate) {
      throw new ConflictException({ code: 'BOOK-001', message: 'A book with this title already exists' });
    }

    const systemPrompt = S1_EVALUATION_SYSTEM_PROMPT;
    const userPrompt = buildS1EvaluationUserPrompt(payload.title, payload.description);

    const llmResponse = await this.llmService.complete({
      prompt: userPrompt,
      systemPrompt,
      responseFormat: 'json',
      maxTokens: 2048,
      temperature: 0.3,
    });

    // Debug: Log raw LLM response
    this.logger.debug(`Raw LLM response: ${llmResponse.content.substring(0, 500)}...`);

    let evaluation;
    try {
      evaluation = this.parseEvaluation(llmResponse.content);
    } catch (error) {
      this.logger.error(`S1 evaluation parse failed. Raw content: ${llmResponse.content}`);
      this.logger.error(`Parse error: ${error}`);
      throw new LlmError('LLM-004', 'S1 response schema validation failed', true, llmResponse.provider, error);
    }

    const isPipelineEligible = evaluation.verdict === 'DIAMOND' || evaluation.verdict === 'GOLD';
    const created = await this.repository.createBook({
      title: payload.title,
      description: payload.description,
      bookLink: payload.bookLink,
      language: payload.language ?? 'en',
      createdBy: user.uid,
      s1Verdict: evaluation.verdict,
      s1Score: evaluation.totalScore,
      s1VerdictConfidence: evaluation.verdictConfidence,
      s1PrimarySpiId: evaluation.primarySpi?.id?.toString(),
      s1PrimarySpiName: evaluation.primarySpi?.name,
      isPipelineEligible,
      s1Output: evaluation,
      evaluatedAt: new Date(),
    });

    this.eventEmitter.emit(
      'book.registered',
      new BookRegisteredEvent(created.id, created.title),
    );
    this.eventEmitter.emit(
      'book.evaluated',
      new BookEvaluatedEvent(created.id, evaluation.verdict, evaluation.totalScore, isPipelineEligible),
    );

    return {
      bookId: created.id,
      title: created.title,
      s1Verdict: evaluation.verdict,
      s1Score: evaluation.totalScore,
      s1VerdictConfidence: evaluation.verdictConfidence,
      isPipelineEligible,
      s1Summary: {
        primarySpiName: evaluation.primarySpi?.name ?? '',
        behavioralImpactStatement: evaluation.behavioralImpactStatement ?? '',
        greenFlags: evaluation.greenFlags ?? [],
        redFlags: evaluation.redFlags ?? [],
      },
      evaluatedAt: created.evaluatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  /**
   * Parse LLM response to extract valid JSON
   * Handles various formats: pure JSON, markdown fenced, text + JSON mix
   */
  private parseEvaluation(content: string) {
    // Step 1: Clean the content
    let cleanContent = content.trim();

    // Step 2: Remove markdown code fences if present
    // Handles ```json ... ``` or ``` ... ```
    const codeFenceMatch = cleanContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeFenceMatch) {
      cleanContent = codeFenceMatch[1].trim();
      this.logger.debug('Extracted JSON from code fence');
    }

    // Step 3: Try direct parse first
    try {
      const parsed = JSON.parse(cleanContent);
      this.logger.debug('Direct JSON parse successful');
      return S1EvaluationSchema.parse(parsed);
    } catch (directError) {
      this.logger.debug(`Direct parse failed: ${directError}`);
    }

    // Step 4: Try to find JSON object in the text
    // Look for content between first { and last }
    const firstBrace = cleanContent.indexOf('{');
    const lastBrace = cleanContent.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonCandidate = cleanContent.substring(firstBrace, lastBrace + 1);

      try {
        const parsed = JSON.parse(jsonCandidate);
        this.logger.debug('Extracted JSON from text successfully');
        return S1EvaluationSchema.parse(parsed);
      } catch (extractError) {
        this.logger.debug(`Extracted JSON parse failed: ${extractError}`);
      }
    }

    // Step 5: Try to fix common JSON issues
    try {
      // Remove potential trailing commas before } or ]
      let fixedContent = cleanContent
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');

      // Try to extract JSON again after fixes
      const firstBraceFixed = fixedContent.indexOf('{');
      const lastBraceFixed = fixedContent.lastIndexOf('}');

      if (firstBraceFixed !== -1 && lastBraceFixed !== -1) {
        const jsonFixed = fixedContent.substring(firstBraceFixed, lastBraceFixed + 1);
        const parsed = JSON.parse(jsonFixed);
        this.logger.debug('Fixed JSON parse successful');
        return S1EvaluationSchema.parse(parsed);
      }
    } catch (fixError) {
      this.logger.debug(`Fixed JSON parse failed: ${fixError}`);
    }

    // All attempts failed
    throw new LlmError(
      'LLM-004',
      'LLM response invalid JSON',
      true,
      'claude',
      new Error(`Could not parse JSON from response: ${content.substring(0, 200)}...`)
    );
  }

  async getBook(id: string): Promise<BookDetailResponse> {
    const result = await this.repository.getBookById(id);
    if (!result) {
      throw new NotFoundException({ code: 'BOOK-002', message: 'Book not found' });
    }

    const { book, totalChapters, totalWordCount, pipelineStatus } = result;

    return {
      id: book.id,
      title: book.title,
      description: book.description,
      bookLink: book.bookLink,
      language: book.language,
      s1Verdict: book.s1Verdict,
      s1Score: book.s1Score,
      s1VerdictConfidence: book.s1VerdictConfidence,
      isPipelineEligible: book.isPipelineEligible,
      chaptersLocked: book.chaptersLocked,
      totalChapters,
      totalWordCount,
      pipelineStatus,
      createdAt: book.createdAt.toISOString(),
      createdBy: {
        id: book.createdByAdmin?.id ?? '',
        displayName: book.createdByAdmin?.displayName ?? null,
      },
    };
  }

  async listBooks(query: ListBooksQueryDto): Promise<ListBooksResponse> {
    const params = ListBooksQuerySchema.parse(query);
    const { books, total } = await this.repository.listBooks(params);

    return {
      books: books.map((book) => ({
        id: book.id,
        title: book.title,
        s1Verdict: book.s1Verdict,
        s1Score: book.s1Score,
        s1VerdictConfidence: book.s1VerdictConfidence,
        isPipelineEligible: book.isPipelineEligible,
        pipelineStatus: book.pipelineRun?.status ?? null,
        createdAt: book.createdAt.toISOString(),
      })),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }
}