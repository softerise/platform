import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type Course,
  type Episode,
  type PracticeSession,
  type Question,
  type Answer,
  type CourseStatus,
  type EpisodeType,
  type PracticeLevel,
  type PracticeStakes,
  type QuestionFormat,
  type AnswerQuality,
} from '@prisma/client';
import { PrismaService } from '../_core';

// ============================================================================
// Types
// ============================================================================

export interface CourseFilters {
  status?: CourseStatus;
  bookId?: string;
  page: number;
  pageSize: number;
}

export interface PopulateCourseData {
  title: string;
  corePromise?: string;
  totalEpisodes: number;
  totalDurationMinutes?: number;
  totalPracticeSessions?: number;
  targetPersona?: Prisma.InputJsonValue;
  skillsSummary?: Prisma.InputJsonValue;
  spiMapping?: Prisma.InputJsonValue;
  qualityScores?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
}

export interface CreateEpisodeData {
  episodeNumber: number;
  title: string;
  type: EpisodeType;
  learningObjective?: string;
  estimatedDurationMinutes?: number;
  totalWordCount?: number;
  textContent?: string;
  draftData?: Prisma.InputJsonValue;
  contentData?: Prisma.InputJsonValue;
  outlineData?: Prisma.InputJsonValue;
}

export interface CreatePracticeSessionData {
  practiceId: number;
  level: PracticeLevel;
  levelOrder: number;
  skillsTested: string[];
  stakes: PracticeStakes;
  scenarioSituation?: string;
  scenarioContext?: string;
  sessionData?: Prisma.InputJsonValue;
}

export interface CreateQuestionData {
  questionId: string;
  questionOrder: number;
  questionFormat: QuestionFormat;
  skillFocus?: string;
  questionText: string;
}

export interface CreateAnswerData {
  answerId: string;
  answerOrder: number;
  answerText: string;
  answerQuality: AnswerQuality;
  isCorrect: boolean;
  feedback?: string;
}

// ============================================================================
// Prisma Payload Types
// ============================================================================

export type CourseWithBook = Prisma.CourseGetPayload<{
  include: {
    book: { select: { id: true; title: true } };
  };
}>;

export type CourseWithEpisodes = Prisma.CourseGetPayload<{
  include: {
    book: { select: { id: true; title: true } };
    episodes: { orderBy: { episodeNumber: 'asc' } };
  };
}>;

export type CourseWithPractice = Prisma.CourseGetPayload<{
  include: {
    book: { select: { id: true; title: true } };
    practiceSessions: {
      include: {
        questions: {
          include: {
            answers: { orderBy: { answerOrder: 'asc' } };
          };
          orderBy: { questionOrder: 'asc' };
        };
      };
      orderBy: [{ level: 'asc' }, { levelOrder: 'asc' }];
    };
  };
}>;

export type CourseFullPayload = Prisma.CourseGetPayload<{
  include: {
    book: { select: { id: true; title: true } };
    episodes: { orderBy: { episodeNumber: 'asc' } };
    practiceSessions: {
      include: {
        questions: {
          include: {
            answers: { orderBy: { answerOrder: 'asc' } };
          };
          orderBy: { questionOrder: 'asc' };
        };
      };
      orderBy: [{ level: 'asc' }, { levelOrder: 'asc' }];
    };
  };
}>;

export type PracticeSessionWithQuestions = Prisma.PracticeSessionGetPayload<{
  include: {
    questions: {
      include: {
        answers: { orderBy: { answerOrder: 'asc' } };
      };
      orderBy: { questionOrder: 'asc' };
    };
  };
}>;

export type EpisodeWithContent = Episode;

// ============================================================================
// Repository
// ============================================================================

@Injectable()
export class CourseRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // Course CRUD
  // ============================================================================

  async findById(id: string): Promise<CourseWithBook | null> {
    return this.prisma.course.findUnique({
      where: { id },
      include: {
        book: { select: { id: true, title: true } },
      },
    });
  }

  async findByIdWithEpisodes(id: string): Promise<CourseWithEpisodes | null> {
    return this.prisma.course.findUnique({
      where: { id },
      include: {
        book: { select: { id: true, title: true } },
        episodes: { orderBy: { episodeNumber: 'asc' } },
      },
    });
  }

  async findByIdWithPractice(id: string): Promise<CourseWithPractice | null> {
    return this.prisma.course.findUnique({
      where: { id },
      include: {
        book: { select: { id: true, title: true } },
        practiceSessions: {
          include: {
            questions: {
              include: {
                answers: { orderBy: { answerOrder: 'asc' } },
              },
              orderBy: { questionOrder: 'asc' },
            },
          },
          orderBy: [{ level: 'asc' }, { levelOrder: 'asc' }],
        },
      },
    });
  }

  async findByIdFull(id: string): Promise<CourseFullPayload | null> {
    return this.prisma.course.findUnique({
      where: { id },
      include: {
        book: { select: { id: true, title: true } },
        episodes: { orderBy: { episodeNumber: 'asc' } },
        practiceSessions: {
          include: {
            questions: {
              include: {
                answers: { orderBy: { answerOrder: 'asc' } },
              },
              orderBy: { questionOrder: 'asc' },
            },
          },
          orderBy: [{ level: 'asc' }, { levelOrder: 'asc' }],
        },
      },
    });
  }

  async findByPipelineId(pipelineRunId: string): Promise<CourseWithBook | null> {
    return this.prisma.course.findUnique({
      where: { pipelineRunId },
      include: {
        book: { select: { id: true, title: true } },
      },
    });
  }

  async findMany(filters: CourseFilters): Promise<{ courses: CourseWithBook[]; total: number }> {
    const where: Prisma.CourseWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.bookId) {
      where.bookId = filters.bookId;
    }

    const [courses, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        include: {
          book: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.course.count({ where }),
    ]);

    return { courses, total };
  }

  async populateCourse(courseId: string, data: PopulateCourseData): Promise<Course> {
    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        title: data.title,
        corePromise: data.corePromise,
        totalEpisodes: data.totalEpisodes,
        totalDurationMinutes: data.totalDurationMinutes,
        totalPracticeSessions: data.totalPracticeSessions,
        targetPersona: data.targetPersona ?? Prisma.JsonNull,
        skillsSummary: data.skillsSummary ?? Prisma.JsonNull,
        spiMapping: data.spiMapping ?? Prisma.JsonNull,
        qualityScores: data.qualityScores ?? Prisma.JsonNull,
        metadata: data.metadata ?? Prisma.JsonNull,
      },
    });
  }

  // ============================================================================
  // Episode Operations
  // ============================================================================

  async createEpisodes(courseId: string, episodes: CreateEpisodeData[]): Promise<Episode[]> {
    const created: Episode[] = [];

    for (const ep of episodes) {
      const episode = await this.prisma.episode.create({
        data: {
          courseId,
          episodeNumber: ep.episodeNumber,
          title: ep.title,
          type: ep.type,
          learningObjective: ep.learningObjective,
          estimatedDurationMinutes: ep.estimatedDurationMinutes
            ? new Prisma.Decimal(ep.estimatedDurationMinutes)
            : null,
          totalWordCount: ep.totalWordCount,
          textContent: ep.textContent,
          status: 'CONTENT_READY',
          draftData: ep.draftData ?? Prisma.JsonNull,
          contentData: ep.contentData ?? Prisma.JsonNull,
          outlineData: ep.outlineData ?? Prisma.JsonNull,
        },
      });
      created.push(episode);
    }

    return created;
  }

  async findEpisodeByNumber(courseId: string, episodeNumber: number): Promise<EpisodeWithContent | null> {
    return this.prisma.episode.findUnique({
      where: {
        courseId_episodeNumber: {
          courseId,
          episodeNumber,
        },
      },
    });
  }

  async findEpisodesByCourseId(courseId: string): Promise<Episode[]> {
    return this.prisma.episode.findMany({
      where: { courseId },
      orderBy: { episodeNumber: 'asc' },
    });
  }

  // ============================================================================
  // Practice Session Operations
  // ============================================================================

  async createPracticeSession(
    courseId: string,
    data: CreatePracticeSessionData,
  ): Promise<PracticeSession> {
    return this.prisma.practiceSession.create({
      data: {
        courseId,
        practiceId: data.practiceId,
        level: data.level,
        levelOrder: data.levelOrder,
        skillsTested: data.skillsTested,
        stakes: data.stakes,
        scenarioSituation: data.scenarioSituation,
        scenarioContext: data.scenarioContext,
        sessionData: data.sessionData ?? Prisma.JsonNull,
      },
    });
  }

  async createQuestion(sessionId: string, data: CreateQuestionData): Promise<Question> {
    return this.prisma.question.create({
      data: {
        practiceSessionId: sessionId,
        questionId: data.questionId,
        questionOrder: data.questionOrder,
        questionFormat: data.questionFormat,
        skillFocus: data.skillFocus,
        questionText: data.questionText,
      },
    });
  }

  async createAnswers(questionId: string, answers: CreateAnswerData[]): Promise<Answer[]> {
    const created: Answer[] = [];

    for (const ans of answers) {
      const answer = await this.prisma.answer.create({
        data: {
          questionId,
          answerId: ans.answerId,
          answerOrder: ans.answerOrder,
          answerText: ans.answerText,
          answerQuality: ans.answerQuality,
          isCorrect: ans.isCorrect,
          feedback: ans.feedback,
        },
      });
      created.push(answer);
    }

    return created;
  }

  async findPracticeSessionsByCourseId(
    courseId: string,
    level?: PracticeLevel,
  ): Promise<PracticeSessionWithQuestions[]> {
    const where: Prisma.PracticeSessionWhereInput = { courseId };
    if (level) {
      where.level = level;
    }

    return this.prisma.practiceSession.findMany({
      where,
      include: {
        questions: {
          include: {
            answers: { orderBy: { answerOrder: 'asc' } },
          },
          orderBy: { questionOrder: 'asc' },
        },
      },
      orderBy: [{ level: 'asc' }, { levelOrder: 'asc' }],
    });
  }

  async findPracticeSessionById(sessionId: string): Promise<PracticeSessionWithQuestions | null> {
    return this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        questions: {
          include: {
            answers: { orderBy: { answerOrder: 'asc' } },
          },
          orderBy: { questionOrder: 'asc' },
        },
      },
    });
  }

  // ============================================================================
  // Bulk Practice Creation
  // ============================================================================

  async deleteExistingPracticeContent(courseId: string): Promise<void> {
    // Delete in proper order due to FK constraints
    await this.prisma.answer.deleteMany({
      where: {
        question: {
          practiceSession: { courseId },
        },
      },
    });

    await this.prisma.question.deleteMany({
      where: {
        practiceSession: { courseId },
      },
    });

    await this.prisma.practiceSession.deleteMany({
      where: { courseId },
    });
  }

  async deleteExistingEpisodes(courseId: string): Promise<void> {
    await this.prisma.episode.deleteMany({
      where: { courseId },
    });
  }
}

