import { CourseStatus, EpisodeType, PracticeLevel } from '@prisma/client';
import { z } from 'zod';

// ============================================================================
// Query Schemas (with validation)
// ============================================================================

export const CourseStatusEnum = z.nativeEnum(CourseStatus);
export const PracticeLevelEnum = z.nativeEnum(PracticeLevel);

const booleanPreprocess = z.preprocess((value) => {
    if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;
    }
    return value;
}, z.boolean());

export const ListCoursesQuerySchema = z.object({
    status: CourseStatusEnum.optional(),
    bookId: z.string().uuid().optional(),
    page: z.preprocess(
        (val) => (val === undefined ? 1 : Number(val)),
        z.number().int().positive().default(1),
    ),
    pageSize: z.preprocess(
        (val) => (val === undefined ? 20 : Number(val)),
        z.number().int().min(1).max(100).default(20),
    ),
});
export type ListCoursesQueryDto = z.infer<typeof ListCoursesQuerySchema>;

export const GetCourseQuerySchema = z.object({
    includeEpisodes: booleanPreprocess.optional().default(true),
    includePractice: booleanPreprocess.optional().default(false),
});
export type GetCourseQueryDto = z.infer<typeof GetCourseQuerySchema>;

export const GetPracticeQuerySchema = z.object({
    level: PracticeLevelEnum.optional(),
});
export type GetPracticeQueryDto = z.infer<typeof GetPracticeQuerySchema>;

// ============================================================================
// Response DTOs
// ============================================================================

export interface SkillsSummaryDto {
    foundational_skills: string[];
    combined_skills: string[];
    integrated_skills: string[];
    total_skills_count: number;
}

export interface CourseBookDto {
    id: string;
    title: string;
}

// Course Summary for List endpoint
export interface CourseSummaryDto {
    id: string;
    title: string;
    description: string | null;
    language: string;
    totalEpisodes: number;
    totalDuration: number | null;
    qualityScore: number | null;
    status: CourseStatus;
    book: CourseBookDto;
    createdAt: string;
    approvedAt: string | null;
}

// Course Response (standard get endpoint)
export interface CourseResponseDto {
    id: string;
    title: string;
    description: string | null;
    language: string;
    totalEpisodes: number;
    totalDuration: number | null;
    totalPracticeSessions: number | null;
    qualityScore: number | null;
    status: CourseStatus;
    book: CourseBookDto;
    createdAt: string;
    approvedAt: string | null;
    deployedAt: string | null;
}

// Course Detail Response (with optional relations)
export interface CourseDetailResponseDto extends CourseResponseDto {
    skillsSummary: SkillsSummaryDto | null;
    targetPersona: {
        who: string;
        struggle: string;
        desired_outcome: string;
    } | null;
    episodes?: EpisodeSummaryDto[];
    practiceSessions?: PracticeSessionSummaryDto[];
}

// ============================================================================
// Episode DTOs
// ============================================================================

export interface EpisodeSummaryDto {
    id: string;
    episodeNumber: number;
    title: string;
    episodeType: EpisodeType;
    learningObjective: string | null;
    wordCount: number | null;
    estimatedDuration: number | null;
}

export interface KeyPointDeliveredDto {
    point: string;
    purpose: string;
    confirmed: boolean;
}

export interface EpisodeDetailDto extends EpisodeSummaryDto {
    audioScript: string | null;
    keyPoints: KeyPointDeliveredDto[];
}

// ============================================================================
// Practice Session DTOs
// ============================================================================

export interface ScenarioDto {
    situation: string;
    context: string;
    stakes: string;
}

export interface PracticeSessionSummaryDto {
    id: string;
    practiceId: number;
    level: PracticeLevel;
    levelOrder: number;
    skillsTested: string[];
    scenario: ScenarioDto | null;
    questionCount: number;
}

export interface AnswerDto {
    id: string;
    answerId: string;
    answerOrder: number;
    answerText: string;
    answerQuality: string;
    isCorrect: boolean;
    feedback: string | null;
}

export interface QuestionDto {
    id: string;
    questionId: string;
    questionOrder: number;
    questionFormat: string;
    skillFocus: string | null;
    questionText: string;
    answers: AnswerDto[];
}

export interface PracticeSessionDetailDto extends PracticeSessionSummaryDto {
    questions: QuestionDto[];
}

// ============================================================================
// List Response
// ============================================================================

export interface CourseListResponseDto {
    courses: CourseSummaryDto[];
    total: number;
    page: number;
    pageSize: number;
}

