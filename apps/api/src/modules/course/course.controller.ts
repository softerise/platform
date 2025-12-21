import { BadRequestException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Query, UsePipes } from '@nestjs/common';
import { ZodPipe } from '../_core';
import { CourseService } from './course.service';
import {
  ListCoursesQuerySchema,
  GetCourseQuerySchema,
  GetPracticeQuerySchema,
  type ListCoursesQueryDto,
  type GetCourseQueryDto,
  type GetPracticeQueryDto,
  type CourseListResponseDto,
  type CourseDetailResponseDto,
  type CourseSummaryDto,
  type EpisodeSummaryDto,
  type EpisodeDetailDto,
  type PracticeSessionSummaryDto,
  type PracticeSessionDetailDto,
  type SkillsSummaryDto,
  type ScenarioDto,
  type KeyPointDeliveredDto,
} from './dto/course-response.dto';
import type {
  CourseWithBook,
  CourseWithEpisodes,
  CourseFullPayload,
  PracticeSessionWithQuestions,
  EpisodeWithContent,
} from './course.repository';
import type { Episode, PracticeLevel } from '@prisma/client';

// TODO: Add proper authentication in production
// @UseGuards(FirebaseAuthGuard, RolesGuard)
// @Roles('SUPER_ADMIN', 'CONTENT_MANAGER')
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  // ============================================================================
  // Course Endpoints
  // ============================================================================

  @Get()
  // @Roles('SUPER_ADMIN', 'CONTENT_MANAGER')
  @UsePipes(new ZodPipe(ListCoursesQuerySchema))
  async listCourses(@Query() query: ListCoursesQueryDto): Promise<CourseListResponseDto> {
    const { courses, total } = await this.courseService.listCourses({
      status: query.status,
      bookId: query.bookId,
      page: query.page,
      pageSize: query.pageSize,
    });

    return {
      courses: courses.map((c) => this.mapToCourseSummary(c)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  @Get(':id')
  // @Roles('SUPER_ADMIN', 'CONTENT_MANAGER')
  async getCourse(
    @Param('id') id: string,
    @Query(new ZodPipe(GetCourseQuerySchema)) query: GetCourseQueryDto,
  ): Promise<CourseDetailResponseDto> {
    const course = await this.courseService.getCourse(id, query.includeEpisodes, query.includePractice);
    return this.mapToCourseDetail(course, query.includeEpisodes, query.includePractice);
  }

  // ============================================================================
  // Episode Endpoints
  // ============================================================================

  @Get(':id/episodes')
  // @Roles('SUPER_ADMIN', 'CONTENT_MANAGER')
  async getCourseEpisodes(@Param('id') id: string): Promise<EpisodeSummaryDto[]> {
    const episodes = await this.courseService.getEpisodes(id);
    return episodes.map((e) => this.mapToEpisodeSummary(e));
  }

  @Get(':id/episodes/:episodeNumber')
  // @Roles('SUPER_ADMIN', 'CONTENT_MANAGER')
  async getEpisode(
    @Param('id') id: string,
    @Param('episodeNumber') episodeNumber: string,
  ): Promise<EpisodeDetailDto> {
    const epNum = parseInt(episodeNumber, 10);
    if (isNaN(epNum)) {
      throw new Error('Invalid episode number');
    }

    const episode = await this.courseService.getEpisodeByNumber(id, epNum);
    return this.mapToEpisodeDetail(episode);
  }

  // ============================================================================
  // Practice Session Endpoints
  // ============================================================================

  @Get(':id/practice')
  // @Roles('SUPER_ADMIN', 'CONTENT_MANAGER')
  async getCoursePractice(
    @Param('id') id: string,
    @Query(new ZodPipe(GetPracticeQuerySchema)) query: GetPracticeQueryDto,
  ): Promise<PracticeSessionSummaryDto[]> {
    const sessions = await this.courseService.getPracticeSessions(id, query.level as PracticeLevel);
    return sessions.map((s) => this.mapToPracticeSessionSummary(s));
  }

  @Get(':id/practice/:sessionId')
  // @Roles('SUPER_ADMIN', 'CONTENT_MANAGER')
  async getPracticeSession(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
  ): Promise<PracticeSessionDetailDto> {
    const session = await this.courseService.getPracticeSessionById(id, sessionId);
    return this.mapToPracticeSessionDetail(session);
  }

  // ============================================================================
  // Admin Operations
  // ============================================================================

  /**
   * Re-populate course content from pipeline outputs.
   * Useful for fixing courses that were created before Epic 9 population logic.
   */
  @Post(':id/repopulate')
  // @Roles('SUPER_ADMIN')
  async repopulateCourse(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<{ success: boolean; message: string; courseId: string }> {
    // Find course to get pipelineRunId
    const course = await this.courseService.getCourseById(id);
    if (!course) {
      throw new NotFoundException({ code: 'COURSE-001', message: 'Course not found' });
    }

    const pipelineRunId = course.pipelineRunId;
    if (!pipelineRunId) {
      throw new BadRequestException({ 
        code: 'COURSE-002', 
        message: 'No pipeline associated with this course' 
      });
    }

    const populated = await this.courseService.populateFromPipeline(pipelineRunId);
    if (!populated) {
      throw new BadRequestException({ 
        code: 'COURSE-003', 
        message: 'Failed to populate course - check pipeline outputs (output_data may be null)' 
      });
    }

    return { 
      success: true, 
      message: 'Course repopulated successfully', 
      courseId: id 
    };
  }

  /**
   * Deploy an approved course (APPROVED → DEPLOYED)
   */
  @Post(':id/deploy')
  // @Roles('SUPER_ADMIN')
  async deploy(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<{ id: string; title: string; status: string; deployedAt: string; message: string }> {
    return this.courseService.deploy(id);
  }

  // ============================================================================
  // Mappers
  // ============================================================================

  private mapToCourseSummary(course: CourseWithBook): CourseSummaryDto {
    return {
      id: course.id,
      title: course.title,
      description: course.corePromise,
      language: course.language,
      totalEpisodes: course.totalEpisodes,
      totalDuration: course.totalDurationMinutes,
      qualityScore: (course.qualityScores as { total_score?: number } | null)?.total_score ?? null,
      status: course.status,
      book: {
        id: course.book.id,
        title: course.book.title,
      },
      createdAt: course.createdAt.toISOString(),
      approvedAt: course.approvedAt?.toISOString() ?? null,
    };
  }

  private mapToCourseDetail(
    course: CourseFullPayload | CourseWithEpisodes | CourseWithBook,
    includeEpisodes: boolean,
    includePractice: boolean,
  ): CourseDetailResponseDto {
    const skillsSummary = course.skillsSummary as SkillsSummaryDto | null;
    const targetPersona = course.targetPersona as { who: string; struggle: string; desired_outcome: string } | null;

    const result: CourseDetailResponseDto = {
      id: course.id,
      title: course.title,
      description: course.corePromise,
      language: course.language,
      totalEpisodes: course.totalEpisodes,
      totalDuration: course.totalDurationMinutes,
      totalPracticeSessions: course.totalPracticeSessions,
      qualityScore: (course.qualityScores as { total_score?: number } | null)?.total_score ?? null,
      status: course.status,
      book: {
        id: course.book.id,
        title: course.book.title,
      },
      createdAt: course.createdAt.toISOString(),
      approvedAt: course.approvedAt?.toISOString() ?? null,
      deployedAt: course.deployedAt?.toISOString() ?? null,
      skillsSummary,
      targetPersona,
    };

    if (includeEpisodes && 'episodes' in course && course.episodes) {
      result.episodes = course.episodes.map((e) => this.mapToEpisodeSummary(e));
    }

    if (includePractice && 'practiceSessions' in course && course.practiceSessions) {
      result.practiceSessions = course.practiceSessions.map((s) => this.mapToPracticeSessionSummary(s));
    }

    return result;
  }

  private mapToEpisodeSummary(episode: Episode): EpisodeSummaryDto {
    return {
      id: episode.id,
      episodeNumber: episode.episodeNumber,
      title: episode.title,
      episodeType: episode.type,
      learningObjective: episode.learningObjective,
      wordCount: episode.totalWordCount,
      estimatedDuration: episode.estimatedDurationMinutes
        ? Number(episode.estimatedDurationMinutes)
        : null,
    };
  }

  private mapToEpisodeDetail(episode: EpisodeWithContent): EpisodeDetailDto {
    const contentData = episode.contentData as { key_points_delivered?: KeyPointDeliveredDto[] } | null;

    return {
      id: episode.id,
      episodeNumber: episode.episodeNumber,
      title: episode.title,
      episodeType: episode.type,
      learningObjective: episode.learningObjective,
      wordCount: episode.totalWordCount,
      estimatedDuration: episode.estimatedDurationMinutes
        ? Number(episode.estimatedDurationMinutes)
        : null,
      audioScript: episode.textContent,
      keyPoints: contentData?.key_points_delivered ?? [],
    };
  }

  private mapToPracticeSessionSummary(session: PracticeSessionWithQuestions): PracticeSessionSummaryDto {
    const scenario: ScenarioDto | null = session.scenarioSituation
      ? {
          situation: session.scenarioSituation,
          context: session.scenarioContext ?? '',
          stakes: session.stakes,
        }
      : null;

    return {
      id: session.id,
      practiceId: session.practiceId,
      level: session.level,
      levelOrder: session.levelOrder,
      skillsTested: session.skillsTested,
      scenario,
      questionCount: session.questions.length,
    };
  }

  private mapToPracticeSessionDetail(session: PracticeSessionWithQuestions): PracticeSessionDetailDto {
    const scenario: ScenarioDto | null = session.scenarioSituation
      ? {
          situation: session.scenarioSituation,
          context: session.scenarioContext ?? '',
          stakes: session.stakes,
        }
      : null;

    return {
      id: session.id,
      practiceId: session.practiceId,
      level: session.level,
      levelOrder: session.levelOrder,
      skillsTested: session.skillsTested,
      scenario,
      questionCount: session.questions.length,
      questions: session.questions.map((q) => ({
        id: q.id,
        questionId: q.questionId,
        questionOrder: q.questionOrder,
        questionFormat: q.questionFormat,
        skillFocus: q.skillFocus,
        questionText: q.questionText,
        answers: q.answers.map((a) => ({
          id: a.id,
          answerId: a.answerId,
          answerOrder: a.answerOrder,
          answerText: a.answerText,
          answerQuality: a.answerQuality,
          isCorrect: a.isCorrect,
          feedback: a.feedback,
        })),
      })),
    };
  }
}

