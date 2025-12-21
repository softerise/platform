import { Injectable, Logger } from '@nestjs/common';
import { StepType } from '@prisma/client';
import {
  IStepHandler,
  StepContext,
  StepOutput,
  StepPrompt,
  ValidationResult,
} from './step-handler.interface';
import { S6_PROMPT, S6PromptParams, PracticeLevel } from '../prompts/s6-practice-content.prompt';
import { getS6Config } from '../prompts/s6.config';

/**
 * S6 Practice Content Handler - Level-Based Execution
 * 
 * Generates practice content per LEVEL (BASIC, INTERMEDIATE, ADVANCED)
 * to avoid output size limits. Each level produces 3 sessions.
 * 
 * Level is passed via context.practiceLevel (1, 2, or 3)
 */
@Injectable()
export class S6PracticeContentHandler implements IStepHandler {
  readonly stepType: StepType = StepType.S6_PRACTICE_CONTENT;
  private readonly logger = new Logger(S6PracticeContentHandler.name);
  private readonly config = getS6Config();

  private readonly LEVEL_MAP: Record<number, PracticeLevel> = {
    1: 'BASIC',
    2: 'INTERMEDIATE',
    3: 'ADVANCED',
  };

  async buildPrompt(context: StepContext): Promise<StepPrompt> {
    // Get practice level from context (1, 2, or 3)
    const levelNumber = context.practiceLevel ?? context.episodeNumber ?? 1;
    const level = this.LEVEL_MAP[levelNumber] || 'BASIC';

    this.logger.debug(`S6 buildPrompt called for level ${level} (${levelNumber})`);
    this.logger.debug(
      `S6 previousStepOutputs keys: ${JSON.stringify(Object.keys(context.previousStepOutputs || {}))}`,
    );

    // Get S3 output for course outline and skills
    const s3Output = context.previousStepOutputs[StepType.S3_COURSE_OUTLINE];
    if (!s3Output) {
      this.logger.error('S6 missing S3 course outline output');
      throw new Error('S3 course outline required for S6 practice content');
    }

    // Get ALL S5 episode outputs
    const s5Outputs = this.aggregateEpisodeOutputs(context, StepType.S5_EPISODE_CONTENT);
    if (s5Outputs.length === 0) {
      this.logger.error('S6 missing S5 episode content outputs');
      throw new Error('S5 episode content required for S6 practice content');
    }

    this.logger.debug(`S6 found ${s5Outputs.length} S5 episode outputs for level ${level}`);

    // Extract course metadata from S3
    const s3Parsed = (s3Output as any)?.parsed ?? s3Output;
    const courseOutline = s3Parsed?.course_outline ?? s3Parsed;

    const courseTitle =
      courseOutline?.s4_input_data?.course_title ||
      courseOutline?.source_data?.idea_title ||
      context.book.title;

    const corePromise =
      courseOutline?.source_data?.core_promise ||
      courseOutline?.s4_input_data?.core_promise ||
      '';

    const targetPersona = this.buildTargetPersona(courseOutline?.source_data?.target_persona);

    const totalEpisodes =
      courseOutline?.course_parameters?.final_episode_count ||
      courseOutline?.s4_input_data?.total_episodes ||
      s5Outputs.length;

    const params: S6PromptParams = {
      s3OutlineContent: s3Parsed,
      s5EpisodeContents: s5Outputs.map((o) => (o as any)?.parsed ?? o),
      level,
      courseMetadata: {
        courseTitle,
        corePromise,
        targetPersona,
        totalEpisodes,
      },
    };

    return {
      systemPrompt: S6_PROMPT.systemPrompt,
      userPrompt: S6_PROMPT.buildUserPrompt(params),
      responseFormat: 'json',
      maxTokens: this.config.parameters.maxTokens,
      temperature: this.config.parameters.temperature,
    };
  }

  async validateResponse(response: string): Promise<ValidationResult> {
    try {
      // Step 1: Parse JSON
      let parsed: any;
      try {
        parsed = JSON.parse(response);
      } catch (parseError: any) {
        this.logger.error(`S6 JSON parse failed: ${parseError.message}`);
        return {
          valid: false,
          errors: [`JSON parse error: ${parseError.message}`],
        };
      }

      // Step 2: Normalize response structure
      const normalized = this.normalizeResponse(parsed);
      if (!normalized) {
        return {
          valid: false,
          errors: ['Response missing practice_level_content object'],
        };
      }

      const data = normalized.practice_level_content;
      const errors: string[] = [];

      // Step 3: Basic structure validation
      if (!data.level || !['BASIC', 'INTERMEDIATE', 'ADVANCED'].includes(data.level)) {
        errors.push(`Invalid level: ${data.level}`);
      }

      if (!data.practice_sessions || !Array.isArray(data.practice_sessions)) {
        errors.push('Missing practice_sessions array');
        return { valid: false, errors };
      }

      // Step 4: Check exactly 3 sessions for this level
      if (data.practice_sessions.length !== 3) {
        // Warning only - don't fail for slight variations
        this.logger.warn(`S6 Expected 3 sessions for ${data.level}, got ${data.practice_sessions.length}`);
      }

      // Step 5: Validate each session structure
      for (const session of data.practice_sessions) {
        if (!session.questions || session.questions.length < 2) {
          errors.push(`Session ${session.practice_id} has insufficient questions`);
        }

        for (const question of session.questions || []) {
          if (!question.answers || question.answers.length < 3) {
            errors.push(`Question ${question.question_id} has insufficient answers`);
          }

          // Check at least one BEST answer (warning only)
          const bestAnswers = (question.answers || []).filter((a: any) => a.answer_quality === 'BEST');
          if (bestAnswers.length === 0) {
            this.logger.warn(`Question ${question.question_id} missing BEST answer`);
          }
        }
      }

      if (errors.length > 0) {
        return { valid: false, errors };
      }

      return { valid: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`S6 validation unexpected error: ${message}`);
      return {
        valid: false,
        errors: [`Validation error: ${message}`],
      };
    }
  }

  async parseResponse(response: string): Promise<StepOutput> {
    const parsed = JSON.parse(response);
    const normalized = this.normalizeResponse(parsed);

    if (!normalized) {
      throw new Error('Cannot parse S6 response - missing practice_level_content');
    }

    const data = normalized.practice_level_content;

    // Count totals
    let totalQuestions = 0;
    let totalAnswers = 0;
    const formatsUsed = new Set<string>();

    for (const session of data.practice_sessions) {
      totalQuestions += session.questions?.length || 0;
      for (const question of session.questions || []) {
        totalAnswers += question.answers?.length || 0;
        if (question.question_format) {
          formatsUsed.add(question.question_format);
        }
      }
    }

    return {
      raw: response,
      parsed: normalized,
      summary: {
        level: data.level,
        levelNumber: data.level_number || this.getLevelNumber(data.level),
        courseTitle: data.course_metadata?.course_title || '',
        totalSessions: data.practice_sessions.length,
        totalQuestions,
        totalAnswers,
        questionFormatsUsed: Array.from(formatsUsed),
        skillsTested: data.skills_for_level?.skills_tested || [],
      },
    };
  }

  async onSuccess(context: StepContext, output: StepOutput): Promise<void> {
    this.logger.log(
      `S6 Practice content ${output.summary.level} completed: ${output.summary.totalSessions} sessions, ` +
        `${output.summary.totalQuestions} questions, ${output.summary.totalAnswers} answers`,
    );
  }

  private getLevelNumber(level: string): number {
    const map: Record<string, number> = { BASIC: 1, INTERMEDIATE: 2, ADVANCED: 3 };
    return map[level] || 1;
  }

  /**
   * Aggregate all episode outputs for a given step type
   */
  private aggregateEpisodeOutputs(
    context: StepContext,
    stepType: StepType.S4_EPISODE_DRAFT | StepType.S5_EPISODE_CONTENT,
  ): unknown[] {
    const outputs = context.previousStepOutputs[stepType];

    if (!outputs) {
      return [];
    }

    if (Array.isArray(outputs)) {
      return outputs.sort((a: any, b: any) => {
        const aEp = a.episodeNumber ?? a.summary?.episodeNumber ?? 0;
        const bEp = b.episodeNumber ?? b.summary?.episodeNumber ?? 0;
        return aEp - bEp;
      });
    }

    return [outputs];
  }

  /**
   * Build target persona object from source data
   */
  private buildTargetPersona(persona: any): {
    who: string;
    struggle: string;
    desired_outcome: string;
  } {
    if (!persona) {
      return { who: '', struggle: '', desired_outcome: '' };
    }

    return {
      who: persona.who || '',
      struggle: persona.struggle || persona.situation || '',
      desired_outcome: persona.desired_outcome || persona.desiredOutcome || '',
    };
  }

  /**
   * Normalize LLM response to expected schema structure
   */
  private normalizeResponse(parsed: any): { practice_level_content: any } | null {
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    // Case 1: Direct practice_level_content at top level (new format)
    if (parsed.practice_level_content && typeof parsed.practice_level_content === 'object') {
      return { practice_level_content: this.normalizeLevelContent(parsed.practice_level_content) };
    }

    // Case 2: Old format - practice_content (convert to level format)
    if (parsed.practice_content && typeof parsed.practice_content === 'object') {
      return { practice_level_content: this.normalizeLevelContent(parsed.practice_content) };
    }

    // Case 3: camelCase versions
    if (parsed.practiceLevelContent && typeof parsed.practiceLevelContent === 'object') {
      return { practice_level_content: this.normalizeLevelContent(parsed.practiceLevelContent) };
    }

    // Case 4: The response IS the content (no wrapper)
    if (parsed.practice_sessions && Array.isArray(parsed.practice_sessions)) {
      return { practice_level_content: this.normalizeLevelContent(parsed) };
    }

    // Case 5: Nested under result/data
    const possibleKeys = ['result', 'data', 'response', 'content'];
    for (const key of possibleKeys) {
      if (parsed[key] && typeof parsed[key] === 'object') {
        if (parsed[key].practice_level_content) {
          return {
            practice_level_content: this.normalizeLevelContent(parsed[key].practice_level_content),
          };
        }
        if (parsed[key].practice_content) {
          return {
            practice_level_content: this.normalizeLevelContent(parsed[key].practice_content),
          };
        }
        if (parsed[key].practice_sessions) {
          return { practice_level_content: this.normalizeLevelContent(parsed[key]) };
        }
      }
    }

    this.logger.warn(
      `S6 normalizeResponse: could not find practice content in keys: ${Object.keys(parsed).join(', ')}`,
    );
    return null;
  }

  /**
   * Normalize level content object
   */
  private normalizeLevelContent(data: any): any {
    if (!data) return data;

    // Detect level from sessions if not specified
    let level = data.level || 'BASIC';
    if (!data.level && data.practice_sessions?.length > 0) {
      level = data.practice_sessions[0]?.level || 'BASIC';
    }

    return {
      level,
      level_number: data.level_number || this.getLevelNumber(level),
      course_metadata: this.normalizeCourseMetadata(
        data.course_metadata || data.courseMetadata || data.metadata,
      ),
      skills_for_level: {
        skills_tested: data.skills_for_level?.skills_tested || 
                       data.skillsForLevel?.skillsTested || 
                       data.skills_inventory?.foundational_skills ||
                       [],
        skill_type: data.skills_for_level?.skill_type || 
                    data.skillsForLevel?.skillType ||
                    this.getSkillTypeForLevel(level),
      },
      practice_sessions: this.normalizePracticeSessions(
        data.practice_sessions || data.practiceSessions || [],
        level,
      ),
      level_statistics: this.normalizeLevelStatistics(
        data.level_statistics || data.levelStatistics || data.statistics,
        data.practice_sessions || data.practiceSessions || [],
      ),
      processing_timestamp:
        data.processing_timestamp || data.processingTimestamp || new Date().toISOString(),
    };
  }

  private getSkillTypeForLevel(level: string): string {
    const map: Record<string, string> = {
      BASIC: 'FOUNDATIONAL',
      INTERMEDIATE: 'COMBINED',
      ADVANCED: 'INTEGRATED',
    };
    return map[level] || 'FOUNDATIONAL';
  }

  private normalizeCourseMetadata(metadata: any): any {
    if (!metadata) {
      return {
        course_title: '',
        core_promise: '',
        target_persona: { who: '', struggle: '', desired_outcome: '' },
      };
    }

    const targetPersona = metadata.target_persona || metadata.targetPersona || {};

    return {
      course_title: metadata.course_title || metadata.courseTitle || metadata.title || '',
      core_promise: metadata.core_promise || metadata.corePromise || '',
      target_persona: {
        who: targetPersona.who || '',
        struggle: targetPersona.struggle || '',
        desired_outcome: targetPersona.desired_outcome || targetPersona.desiredOutcome || '',
      },
    };
  }

  /**
   * Normalize practice sessions array
   */
  private normalizePracticeSessions(sessions: any[], defaultLevel: string): any[] {
    if (!Array.isArray(sessions)) return [];

    return sessions.map((s, index) => ({
      practice_id: s.practice_id || s.practiceId || s.session_id || s.sessionId || `PRACTICE_${defaultLevel}_${index + 1}`,
      level: s.level || defaultLevel,
      level_description: s.level_description || s.levelDescription || '',
      skills_tested: s.skills_tested || s.skillsTested || s.skills_covered || s.skillsCovered || [],
      episode_relevance: s.episode_relevance || s.episodeRelevance || [],
      scenario: this.normalizeScenario(s.scenario),
      questions: this.normalizeQuestions(s.questions || []),
      session_validation: this.normalizeSessionValidation(
        s.session_validation || s.sessionValidation,
      ),
    }));
  }

  private normalizeScenario(scenario: any): any {
    if (!scenario) {
      return { situation: '', context: '', stakes: 'LOW' };
    }

    if (typeof scenario === 'string') {
      return { situation: scenario, context: '', stakes: 'LOW' };
    }

    return {
      situation: scenario.situation || '',
      context: scenario.context || '',
      stakes: scenario.stakes || 'LOW',
    };
  }

  private normalizeSessionValidation(validation: any): any {
    if (!validation) {
      return {
        scenario_just_right: true,
        question_format_variety: true,
        poor_answers_plausible: true,
        all_feedback_references_concepts: true,
      };
    }

    return {
      scenario_just_right:
        validation.scenario_just_right ?? validation.scenarioJustRight ?? true,
      question_format_variety:
        validation.question_format_variety ?? validation.questionFormatVariety ?? true,
      poor_answers_plausible:
        validation.poor_answers_plausible ?? validation.poorAnswersPlausible ?? true,
      all_feedback_references_concepts:
        validation.all_feedback_references_concepts ??
        validation.allFeedbackReferencesConcepts ??
        true,
    };
  }

  /**
   * Normalize questions array
   */
  private normalizeQuestions(questions: any[]): any[] {
    if (!Array.isArray(questions)) return [];

    return questions.map((q) => ({
      question_id: q.question_id || q.questionId || '',
      question_format: q.question_format || q.questionFormat || 'BEHAVIORAL_ACTION',
      skill_focus: q.skill_focus || q.skillFocus || q.skill_tested || q.skillTested || '',
      question_text: q.question_text || q.questionText || '',
      answers: this.normalizeAnswers(q.answers || []),
    }));
  }

  /**
   * Normalize answers array
   */
  private normalizeAnswers(answers: any[]): any[] {
    if (!Array.isArray(answers)) return [];

    return answers.map((a) => ({
      answer_id: a.answer_id || a.answerId || '',
      answer_text: a.answer_text || a.answerText || a.text || '',
      answer_quality: this.normalizeAnswerQuality(
        a.answer_quality || a.answerQuality || a.quality,
      ),
      is_correct: a.is_correct ?? a.isCorrect ?? false,
      feedback: a.feedback || a.explanation || '',
    }));
  }

  /**
   * Normalize answer quality to THREE-TIER system
   */
  private normalizeAnswerQuality(quality: string): 'BEST' | 'ACCEPTABLE' | 'POOR' {
    if (!quality) return 'ACCEPTABLE';

    const normalized = quality.toUpperCase();

    if (normalized === 'BEST') return 'BEST';
    if (normalized === 'GOOD' || normalized === 'ACCEPTABLE') return 'ACCEPTABLE';
    if (normalized === 'POOR') return 'POOR';

    return 'ACCEPTABLE';
  }

  private normalizeLevelStatistics(stats: any, sessions: any[]): any {
    if (stats) {
      return {
        total_sessions: stats.total_sessions ?? stats.totalSessions ?? sessions.length,
        total_questions: stats.total_questions ?? stats.totalQuestions ?? 0,
        total_answers: stats.total_answers ?? stats.totalAnswers ?? 0,
        question_formats_used: stats.question_formats_used || stats.questionFormatsUsed || [],
      };
    }

    // Calculate from sessions
    let totalQuestions = 0;
    let totalAnswers = 0;
    const formats = new Set<string>();

    for (const session of sessions) {
      const questions = session.questions || session.practiceSessions || [];
      totalQuestions += questions.length;
      for (const q of questions) {
        totalAnswers += (q.answers || []).length;
        if (q.question_format || q.questionFormat) {
          formats.add(q.question_format || q.questionFormat);
        }
      }
    }

    return {
      total_sessions: sessions.length,
      total_questions: totalQuestions,
      total_answers: totalAnswers,
      question_formats_used: Array.from(formats),
    };
  }
}
