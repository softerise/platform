import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  type PracticeLevel,
  type EpisodeType,
  type QuestionFormat,
  type AnswerQuality,
  type PracticeStakes,
} from '@prisma/client';
import { PrismaService } from '../_core';
import {
  CourseRepository,
  type CourseWithBook,
  type CourseWithEpisodes,
  type CourseFullPayload,
  type CourseFilters,
  type PracticeSessionWithQuestions,
  type EpisodeWithContent,
} from './course.repository';
import { PipelineRepository } from '../pipeline/pipeline.repository';
import type { S3Response } from '../pipeline/step-handlers/schemas/s3-response.schema';
import type { S5Response } from '../pipeline/step-handlers/schemas/s5-response.schema';
import type { S6Response } from '../pipeline/step-handlers/schemas/s6-response.schema';
import type { S7Response } from '../pipeline/step-handlers/schemas/s7-response.schema';

// ============================================================================
// Types
// ============================================================================

interface ParsedStepOutput<T> {
  raw: string;
  parsed: T;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class CourseService {
  private readonly logger = new Logger(CourseService.name);

  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly pipelineRepository: PipelineRepository,
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================================
  // Course Population from Pipeline
  // ============================================================================

  /**
   * Populate course from pipeline outputs.
   * Called when pipeline reaches APPROVED status.
   * 
   * Uses a transaction to ensure atomicity - if any step fails,
   * all changes are rolled back to prevent data loss.
   */
  async populateFromPipeline(pipelineRunId: string): Promise<CourseFullPayload | null> {
    this.logger.log(`Starting course population for pipeline ${pipelineRunId}`);

    // 1. Get pipeline with all step outputs (outside transaction - read only)
    const steps = await this.pipelineRepository.findStepsByPipelineId(pipelineRunId);
    if (!steps || steps.length === 0) {
      this.logger.warn(`No steps found for pipeline ${pipelineRunId}`);
      return null;
    }

    // 2. Extract outputs from steps
    const s3Step = steps.find((s) => s.stepType === 'S3_COURSE_OUTLINE' && s.status === 'SUCCESS');
    const s5Steps = steps.filter((s) => s.stepType === 'S5_EPISODE_CONTENT' && s.status === 'SUCCESS');
    const s6Steps = steps.filter((s) => s.stepType === 'S6_PRACTICE_CONTENT' && s.status === 'SUCCESS');
    const s7Step = steps.find((s) => s.stepType === 'S7_FINAL_EVALUATION' && s.status === 'SUCCESS');

    if (!s3Step) {
      this.logger.warn(`S3 output not found for pipeline ${pipelineRunId}`);
      return null;
    }

    // Parse outputs
    const s3Output = this.parseStepOutput<S3Response>(s3Step.outputData);
    const s5Outputs = s5Steps
      .map((s) => ({
        episodeNumber: s.episodeNumber,
        output: this.parseStepOutput<S5Response>(s.outputData),
      }))
      .filter((s) => s.output !== null)
      .sort((a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0));
    const s6Outputs = s6Steps
      .map((s) => ({
        level: s.episodeNumber, // 1=BASIC, 2=INTERMEDIATE, 3=ADVANCED
        output: this.parseStepOutput<S6Response>(s.outputData),
      }))
      .filter((s) => s.output !== null);
    const s7Output = s7Step ? this.parseStepOutput<S7Response>(s7Step.outputData) : null;

    if (!s3Output) {
      this.logger.warn(`Failed to parse S3 output for pipeline ${pipelineRunId}`);
      return null;
    }

    // 3. Find course (should already exist as stub)
    const course = await this.courseRepository.findByPipelineId(pipelineRunId);
    if (!course) {
      this.logger.error(`Course not found for pipeline ${pipelineRunId}`);
      return null;
    }

    // 4. Extract data from S3 output
    const courseOutline = s3Output.course_outline;
    const sourceData = courseOutline.source_data;
    const courseParams = courseOutline.course_parameters;
    const skillsSummary = courseOutline.skills_summary;

    // Calculate total duration from S5 outputs
    const totalDuration = this.calculateTotalDuration(s5Outputs.map((s) => s.output!));

    // Get quality scores from S7
    const qualityScores = s7Output?.final_evaluation?.quality_scores;

    // Count practice sessions
    const totalPracticeSessions = this.countPracticeSessions(s6Outputs.map((s) => s.output!));

    this.logger.log(`Populating course ${course.id} with ${s5Outputs.length} episodes and ${totalPracticeSessions} practice sessions`);

    // 5. Execute all writes in a transaction for atomicity
    try {
      await this.prisma.$transaction(async (tx) => {
        // Step 1: Delete existing content (proper order for FK constraints)
        // Delete answers first (depends on questions)
        await tx.answer.deleteMany({
          where: { question: { practiceSession: { courseId: course.id } } },
        });
        
        // Delete questions (depends on practice sessions)
        await tx.question.deleteMany({
          where: { practiceSession: { courseId: course.id } },
        });
        
        // Delete practice sessions (depends on course)
        await tx.practiceSession.deleteMany({
          where: { courseId: course.id },
        });
        
        // Delete episodes (depends on course)
        await tx.episode.deleteMany({
          where: { courseId: course.id },
        });

        this.logger.debug(`Deleted existing content for course ${course.id}`);

        // Step 2: Update course metadata
        await tx.course.update({
          where: { id: course.id },
          data: {
            title: sourceData?.idea_title || course.title,
            corePromise: sourceData?.core_promise,
            totalEpisodes: courseParams?.final_episode_count || s5Outputs.length,
            totalDurationMinutes: totalDuration,
            totalPracticeSessions: totalPracticeSessions,
            targetPersona: sourceData?.target_persona ?? Prisma.JsonNull,
            skillsSummary: skillsSummary ?? Prisma.JsonNull,
            qualityScores: qualityScores ?? Prisma.JsonNull,
          },
        });

        this.logger.debug(`Updated course metadata for ${course.id}`);

        // Step 3: Create episodes from S5 outputs
        for (const s5 of s5Outputs) {
          const content = s5.output!.episode_content;
          const metadata = content.metadata;
          const production = content.production_output;
          const s3Episode = courseOutline.episodes?.find((e) => e.episode_number === metadata.episode_number);

          // Debug: Log text_content extraction
          this.logger.debug(
            `S5 Episode ${metadata.episode_number}: ` +
            `production_output exists=${!!production}, ` +
            `text_content type=${typeof production?.text_content}, ` +
            `text_content length=${production?.text_content?.length ?? 'null'}`
          );

          await tx.episode.create({
            data: {
              courseId: course.id,
              episodeNumber: metadata.episode_number,
              title: metadata.episode_title,
              type: this.mapEpisodeType(metadata.episode_type),
              learningObjective: metadata.learning_objective,
              estimatedDurationMinutes: production.estimated_duration_minutes
                ? new Prisma.Decimal(production.estimated_duration_minutes)
                : null,
              totalWordCount: production.total_word_count,
              textContent: production.text_content,
              status: 'CONTENT_READY',
              contentData: {
                audio_script: content.audio_script,
                style_analysis: content.style_analysis,
                word_count_summary: content.word_count_summary,
                quality_validation: content.quality_validation,
                evidence_texts_delivered: content.evidence_texts_delivered,
                key_points_delivered: content.audio_script?.core_teaching?.key_points_delivered,
              },
              outlineData: s3Episode
                ? {
                    key_points: s3Episode.key_points,
                    practice_connection: s3Episode.practice_connection,
                    pain_points_addressed: s3Episode.pain_points_addressed,
                  }
                : Prisma.JsonNull,
            },
          });
        }

        this.logger.debug(`Created ${s5Outputs.length} episodes for course ${course.id}`);

        // Step 4: Create practice content from S6 outputs
        for (const s6 of s6Outputs) {
          const s6Data = s6.output as any;
          const practiceContent = s6Data.practice_level_content ?? s6Data.practice_content;
          
          if (!practiceContent) {
            this.logger.warn(`S6 output for level ${s6.level} missing practice content`);
            continue;
          }

          const sessions = practiceContent.practice_sessions ?? [];
          this.logger.debug(`Processing ${sessions.length} practice sessions for level ${s6.level}`);

          for (const session of sessions) {
            // Extract practice_id number
            const practiceIdMatch = session.practice_id?.match(/P(\d+)-(\d+)/) ?? 
                                   session.practice_id?.match(/PRACTICE_\w+_(\d+)/);
            const practiceIdNum = practiceIdMatch
              ? (practiceIdMatch[1] ? parseInt(practiceIdMatch[1]) * 10 : 0) + parseInt(practiceIdMatch[2] ?? practiceIdMatch[1])
              : parseInt(String(session.practice_id).replace(/\D/g, '')) || 1;

            const levelOrder = practiceIdMatch && practiceIdMatch[2] 
              ? parseInt(practiceIdMatch[2]) 
              : parseInt(String(session.practice_id).replace(/\D/g, '')) || 1;

            // Create practice session
            const practiceSession = await tx.practiceSession.create({
              data: {
                courseId: course.id,
                practiceId: practiceIdNum,
                level: (session.level as PracticeLevel) || 'BASIC',
                levelOrder: levelOrder,
                skillsTested: session.skills_tested || [],
                stakes: (session.scenario?.stakes as PracticeStakes) || 'LOW',
                scenarioSituation: session.scenario?.situation,
                scenarioContext: session.scenario?.context,
                sessionData: {
                  level_description: session.level_description,
                  episode_relevance: session.episode_relevance,
                  session_validation: session.session_validation,
                } as Prisma.InputJsonValue,
              },
            });

            // Create questions
            const questions = session.questions || [];
            for (let qIndex = 0; qIndex < questions.length; qIndex++) {
              const question = questions[qIndex];
              const questionOrder = qIndex + 1;

              const createdQuestion = await tx.question.create({
                data: {
                  practiceSessionId: practiceSession.id,
                  questionId: question.question_id || `Q${questionOrder}`,
                  questionOrder: questionOrder,
                  questionFormat: (question.question_format as QuestionFormat) || 'BEHAVIORAL_ACTION',
                  skillFocus: question.skill_focus,
                  questionText: question.question_text || '',
                },
              });

              // Create answers
              const answers = question.answers || [];
              for (let aIndex = 0; aIndex < answers.length; aIndex++) {
                const ans = answers[aIndex];
                await tx.answer.create({
                  data: {
                    questionId: createdQuestion.id,
                    answerId: ans.answer_id || `A${aIndex + 1}`,
                    answerOrder: aIndex + 1,
                    answerText: ans.answer_text || '',
                    answerQuality: (ans.answer_quality as AnswerQuality) || 'ACCEPTABLE',
                    isCorrect: ans.is_correct ?? false,
                    feedback: ans.feedback,
                  },
                });
              }
            }
          }
        }

        this.logger.debug(`Created practice content for course ${course.id}`);
      }, {
        timeout: 60000, // 60 second timeout for transaction
      });

      this.logger.log(`Course ${course.id} fully populated successfully`);

      // Return fully populated course
      return this.courseRepository.findByIdFull(course.id);
    } catch (error) {
      this.logger.error(`Failed to populate course ${course.id}: ${error}`);
      throw error; // Re-throw to let caller handle
    }
  }

  private parseStepOutput<T>(outputData: unknown): T | null {
    if (!outputData || typeof outputData !== 'object') {
      return null;
    }

    const data = outputData as ParsedStepOutput<T>;
    return data.parsed ?? null;
  }

  private calculateTotalDuration(s5Outputs: S5Response[]): number {
    return s5Outputs.reduce((total, s5) => {
      const duration = s5.episode_content?.production_output?.estimated_duration_minutes ?? 0;
      return total + duration;
    }, 0);
  }

  private countPracticeSessions(s6Outputs: S6Response[]): number {
    return s6Outputs.reduce((total, s6) => {
      // S6 handler uses practice_level_content, but schema has practice_content
      const s6Data = s6 as any;
      const practiceContent = s6Data.practice_level_content ?? s6Data.practice_content;
      return total + (practiceContent?.practice_sessions?.length ?? 0);
    }, 0);
  }

  private mapEpisodeType(type: string): EpisodeType {
    const typeMap: Record<string, EpisodeType> = {
      FOUNDATIONAL: 'FOUNDATIONAL',
      CORE: 'CORE',
      APPLICATION: 'APPLICATION',
      INTEGRATION: 'INTEGRATION',
    };
    return typeMap[type] || 'CORE';
  }

  // ============================================================================
  // Course Retrieval
  // ============================================================================

  /**
   * Get course by ID (basic info only, for admin operations)
   */
  async getCourseById(id: string): Promise<CourseWithBook | null> {
    return this.courseRepository.findById(id);
  }

  async getCourse(id: string, includeEpisodes = true, includePractice = false): Promise<CourseFullPayload | CourseWithEpisodes | CourseWithBook> {
    let course;

    if (includePractice) {
      course = await this.courseRepository.findByIdFull(id);
    } else if (includeEpisodes) {
      course = await this.courseRepository.findByIdWithEpisodes(id);
    } else {
      course = await this.courseRepository.findById(id);
    }

    if (!course) {
      throw new NotFoundException({ code: 'COURSE-001', message: 'Course not found' });
    }

    return course;
  }

  async listCourses(filters: CourseFilters): Promise<{ courses: CourseWithBook[]; total: number }> {
    return this.courseRepository.findMany(filters);
  }

  // ============================================================================
  // Episode Retrieval
  // ============================================================================

  async getEpisodes(courseId: string): Promise<EpisodeWithContent[]> {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new NotFoundException({ code: 'COURSE-001', message: 'Course not found' });
    }

    return this.courseRepository.findEpisodesByCourseId(courseId);
  }

  async getEpisodeByNumber(courseId: string, episodeNumber: number): Promise<EpisodeWithContent> {
    const episode = await this.courseRepository.findEpisodeByNumber(courseId, episodeNumber);
    if (!episode) {
      throw new NotFoundException({ code: 'EPISODE-001', message: 'Episode not found' });
    }
    return episode;
  }

  // ============================================================================
  // Practice Session Retrieval
  // ============================================================================

  async getPracticeSessions(courseId: string, level?: PracticeLevel): Promise<PracticeSessionWithQuestions[]> {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new NotFoundException({ code: 'COURSE-001', message: 'Course not found' });
    }

    return this.courseRepository.findPracticeSessionsByCourseId(courseId, level);
  }

  async getPracticeSessionById(courseId: string, sessionId: string): Promise<PracticeSessionWithQuestions> {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new NotFoundException({ code: 'COURSE-001', message: 'Course not found' });
    }

    const session = await this.courseRepository.findPracticeSessionById(sessionId);
    if (!session || session.courseId !== courseId) {
      throw new NotFoundException({ code: 'PRACTICE-001', message: 'Practice session not found' });
    }

    return session;
  }

  // ============================================================================
  // Admin Operations
  // ============================================================================

  /**
   * Deploy an approved course (APPROVED → DEPLOYED)
   */
  async deploy(
    id: string,
  ): Promise<{ id: string; title: string; status: string; deployedAt: string; message: string }> {
    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new NotFoundException({ code: 'COURSE-001', message: 'Course not found' });
    }

    if (course.status !== 'APPROVED') {
      throw new BadRequestException({
        code: 'COURSE-004',
        message: `Only APPROVED courses can be deployed. Current status: ${course.status}`,
      });
    }

    const deployedAt = new Date();
    await this.prisma.course.update({
      where: { id },
      data: {
        status: 'DEPLOYED',
        deployedAt,
      },
    });

    this.logger.log(`Course ${id} deployed`);

    return {
      id,
      title: course.title,
      status: 'DEPLOYED',
      deployedAt: deployedAt.toISOString(),
      message: 'Course deployed successfully',
    };
  }
}

