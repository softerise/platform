import { Injectable, Logger } from '@nestjs/common';
import { StepType } from '@prisma/client';
import {
  IStepHandler,
  StepContext,
  StepOutput,
  StepPrompt,
  ValidationResult,
} from './step-handler.interface';
import { S3_PROMPT, S3PromptParams } from '../prompts/s3-course-outline.prompt';
import { getS3Config } from '../prompts';
import { S3ResponseSchema } from './schemas/s3-response.schema';

@Injectable()
export class S3CourseOutlineHandler implements IStepHandler {
  readonly stepType: StepType = StepType.S3_COURSE_OUTLINE;
  private readonly logger = new Logger(S3CourseOutlineHandler.name);
  private readonly config = getS3Config();

  async buildPrompt(context: StepContext): Promise<StepPrompt> {
    const s2Output = context.previousStepOutputs[StepType.S2_IDEA_INSPIRATION] as
      | StepOutput
      | undefined;

    if (!s2Output) {
      throw new Error('S2 output not found - S3 requires S2 completion');
    }

    const bookContent = context.book.chapters
      .sort((a, b) => a.chapterNumber - b.chapterNumber)
      .map((ch) => `## Chapter ${ch.chapterNumber}: ${ch.chapterTitle ?? 'Untitled'}\n\n${ch.content}`)
      .join('\n\n---\n\n');

    const params: S3PromptParams = {
      s2IdeaInspiration: (s2Output as any)?.parsed ?? s2Output,
      bookContent,
    };

    return {
      systemPrompt: S3_PROMPT.systemPrompt,
      userPrompt: S3_PROMPT.buildUserPrompt(params),
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
        this.logger.error(`S3 JSON parse failed: ${parseError.message}`);
        this.logger.debug(`S3 raw response (first 500 chars): ${response.substring(0, 500)}`);
        return {
          valid: false,
          errors: [`JSON parse error: ${parseError.message}`],
        };
      }

      // Step 2: Debug logging - see what we got
      const topLevelKeys = Object.keys(parsed || {});
      this.logger.debug(`S3 response top-level keys: ${topLevelKeys.join(', ')}`);

      // Step 3: Normalize response structure
      const normalized = this.normalizeResponse(parsed);

      if (!normalized) {
        this.logger.error('S3 response could not be normalized - missing course_outline');
        return {
          valid: false,
          errors: ['Response missing course_outline object'],
        };
      }

      // Step 4: Zod validation
      const result = S3ResponseSchema.safeParse(normalized);

      if (!result.success) {
        const zodErrors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        this.logger.warn(`S3 Zod validation failed: ${zodErrors.join('; ')}`);
        return {
          valid: false,
          errors: zodErrors,
        };
      }

      // Step 5: Business logic validation
      const data = result.data.course_outline;
      const errors: string[] = [];

      // Debug logging for troubleshooting
      this.logger.debug(`S3 validateResponse data keys: ${JSON.stringify(Object.keys(data || {}))}`);
      this.logger.debug(`S3 episodes: ${data?.episodes?.length ?? 'undefined'}`);
      this.logger.debug(`S3 course_parameters: ${JSON.stringify(data?.course_parameters || 'undefined')}`);
      this.logger.debug(`S3 skills_summary: ${JSON.stringify(Object.keys(data?.skills_summary || {}))}`);

      // Defensive: get episodes array safely
      const episodes = Array.isArray(data?.episodes) ? data.episodes.filter(Boolean) : [];

      // Defensive: get course_parameters safely
      const courseParams = data?.course_parameters || {};
      const finalEpisodeCount = courseParams.final_episode_count ?? episodes.length ?? 0;

      if (finalEpisodeCount < 5 || finalEpisodeCount > 10) {
        errors.push(`Episode count ${finalEpisodeCount} outside 5-10 range`);
      }

      if (episodes.length === 0) {
        errors.push('episodes array missing or empty');
      }

      if (episodes.length !== finalEpisodeCount && finalEpisodeCount > 0) {
        this.logger.warn(
          `S3 episodes length ${episodes.length} does not match final_episode_count ${finalEpisodeCount}`,
        );
        // This is a warning, not an error - LLM may return different count
      }

      // Defensive: get skills_summary safely
      const skills = data?.skills_summary || {};
      const foundationalSkills = Array.isArray(skills.foundational_skills) ? skills.foundational_skills : [];
      const combinedSkills = Array.isArray(skills.combined_skills) ? skills.combined_skills : [];
      const integratedSkills = Array.isArray(skills.integrated_skills) ? skills.integrated_skills : [];

      if (foundationalSkills.length < 2) {
        errors.push(`skills_summary requires at least 2 foundational_skills (got ${foundationalSkills.length})`);
      }
      if (combinedSkills.length < 2) {
        errors.push(`skills_summary requires at least 2 combined_skills (got ${combinedSkills.length})`);
      }
      if (integratedSkills.length < 1) {
        errors.push(`skills_summary requires at least 1 integrated_skill (got ${integratedSkills.length})`);
      }

      const expectedTotal = foundationalSkills.length + combinedSkills.length + integratedSkills.length;
      const actualTotal = skills.total_skills_count ?? expectedTotal;
      if (actualTotal !== expectedTotal && actualTotal > 0) {
        this.logger.warn(`S3 total_skills_count mismatch: ${actualTotal} vs ${expectedTotal}`);
        // This is a warning, not an error
      }

      // Defensive: get quality_validation safely
      const qualityValidation = data?.quality_validation || {};
      const overallStatus = (qualityValidation.overall || qualityValidation.overallStatus || '').toUpperCase();

      if (overallStatus !== 'ALL_PASS') {
        errors.push(`Quality validation failed: ${qualityValidation.revision_notes || 'no notes'}`);
      }

      if (errors.length > 0) {
        return { valid: false, errors };
      }

      return { valid: true };
    } catch (error: any) {
      this.logger.error(`S3 validation unexpected error: ${error.message}`, error.stack);
      return {
        valid: false,
        errors: [`Validation error: ${error.message}`],
      };
    }
  }

  async parseResponse(response: string): Promise<StepOutput> {
    const parsed = JSON.parse(response);
    const normalized = this.normalizeResponse(parsed);

    if (!normalized) {
      throw new Error('Cannot parse S3 response - missing course_outline');
    }

    const data = normalized.course_outline;
    const episodes = Array.isArray(data.episodes) ? data.episodes : [];
    const totalEpisodes = data.course_parameters?.final_episode_count ?? episodes.length ?? 0;

    // Provide derived total_episodes for downstream consumers that expect it.
    data.total_episodes = data.total_episodes ?? totalEpisodes;

    return {
      raw: response,
      parsed: normalized,
      summary: {
        courseTitle: data.source_data?.idea_title || 'Untitled Course',
        totalEpisodes,
        estimatedDuration: data.course_parameters?.estimated_total_duration || 'unknown',
        skillsSummary: data.skills_summary || {},
        qualityStatus: data.quality_validation?.overall || 'UNKNOWN',
        proceedToS4: data.proceed_to_s4 ?? false,
        learningArc: episodes.map((e: any) => ({
          episode: e?.episode_number ?? 0,
          type: e?.episode_type ?? 'UNKNOWN',
          objective: e?.learning_objective ?? '',
        })),
      },
    };
  }

  async onSuccess(context: StepContext, output: StepOutput): Promise<void> {
    this.logger.log(`S3 completed for pipeline ${context.pipelineRunId}`);
    this.logger.log(
      `Course: ${output.summary.courseTitle}, Episodes: ${output.summary.totalEpisodes}`,
    );
    this.logger.log(`Skills: ${(output.summary.skillsSummary as any)?.total_skills_count ?? 'n/a'} total`);
  }

  /**
   * Normalize LLM response to expected schema structure.
   * Handles both direct course_outline and nested variations.
   */
  private normalizeResponse(parsed: any): { course_outline: any } | null {
    if (!parsed || typeof parsed !== 'object') {
      this.logger.warn('S3 normalizeResponse: parsed is null or not an object');
      return null;
    }

    // Case 1: Direct course_outline at top level
    if (parsed.course_outline && typeof parsed.course_outline === 'object') {
      return { course_outline: this.normalizeOutline(parsed.course_outline) };
    }

    // Case 2: The response IS the course_outline (no wrapper)
    if (parsed.source_data && parsed.episodes) {
      return { course_outline: this.normalizeOutline(parsed) };
    }

    // Case 3: Nested under different key
    const possibleKeys = ['courseOutline', 'outline', 'result', 'data'];
    for (const key of possibleKeys) {
      if (parsed[key] && typeof parsed[key] === 'object') {
        if (parsed[key].source_data || parsed[key].episodes) {
          return { course_outline: this.normalizeOutline(parsed[key]) };
        }
      }
    }

    this.logger.warn(`S3 normalizeResponse: could not find course_outline in keys: ${Object.keys(parsed).join(', ')}`);
    return null;
  }

  /**
   * Normalize a course outline object - handle camelCase/snake_case variations
   */
  private normalizeOutline(outline: any): any {
    if (!outline) return outline;

    return {
      source_data: this.normalizeSourceData(outline.source_data || outline.sourceData),
      course_parameters: this.normalizeCourseParams(outline.course_parameters || outline.courseParameters),
      episodes: this.normalizeEpisodes(outline.episodes),
      skills_summary: this.normalizeSkillsSummary(outline.skills_summary || outline.skillsSummary),
      quality_validation: this.normalizeQualityValidation(outline.quality_validation || outline.qualityValidation),
      proceed_to_s4: outline.proceed_to_s4 ?? outline.proceedToS4 ?? false,
      s4_input_data: outline.s4_input_data || outline.s4InputData || this.buildS4InputData(outline),
    };
  }

  private normalizeSourceData(source: any): any {
    if (!source) {
      return {
        book_title: '',
        idea_id: '',
        idea_title: '',
        core_promise: '',
        target_persona: { who: '', level: '', situation: '', struggle: '', desired_outcome: '' },
        pain_points: [],
      };
    }

    return {
      book_title: source.book_title || source.bookTitle || '',
      idea_id: source.idea_id || source.ideaId || '',
      idea_title: source.idea_title || source.ideaTitle || '',
      core_promise: source.core_promise || source.corePromise || '',
      target_persona: {
        who: source.target_persona?.who || source.targetPersona?.who || '',
        level: source.target_persona?.level || source.targetPersona?.level || '',
        situation: source.target_persona?.situation || source.targetPersona?.situation || '',
        struggle: source.target_persona?.struggle || source.targetPersona?.struggle || '',
        desired_outcome: source.target_persona?.desired_outcome || source.targetPersona?.desiredOutcome || '',
      },
      pain_points: source.pain_points || source.painPoints || [],
    };
  }

  private normalizeCourseParams(params: any): any {
    if (!params) {
      return {
        final_episode_count: 0,
        structure_type: 'HYBRID',
        estimated_total_duration: 'unknown',
      };
    }

    return {
      final_episode_count: params.final_episode_count ?? params.finalEpisodeCount ?? 0,
      structure_type: params.structure_type || params.structureType || 'HYBRID',
      estimated_total_duration: params.estimated_total_duration || params.estimatedTotalDuration || 'unknown',
    };
  }

  private normalizeEpisodes(episodes: any): any[] {
    if (!Array.isArray(episodes)) {
      this.logger.warn(`S3 normalizeEpisodes: episodes is not an array, got ${typeof episodes}`);
      return [];
    }

    return episodes.filter((ep) => ep != null).map((ep, index) => ({
      episode_number: ep.episode_number ?? ep.episodeNumber ?? index + 1,
      episode_title: ep.episode_title || ep.episodeTitle || ep.title || `Episode ${index + 1}`,
      episode_type: this.normalizeEpisodeType(ep.episode_type || ep.episodeType || ep.type),
      estimated_duration: ep.estimated_duration || ep.estimatedDuration || '5-7 minutes',
      dependencies: ep.dependencies || [],
      learning_objective: ep.learning_objective || ep.learningObjective || '',
      behavioral_clarity: ep.behavioral_clarity || ep.behavioralClarity || 'CLEAR',
      key_points: this.normalizeKeyPoints(ep.key_points || ep.keyPoints),
      practice_connection: this.normalizePracticeConnection(ep.practice_connection || ep.practiceConnection),
      pain_points_addressed: ep.pain_points_addressed || ep.painPointsAddressed || [],
    }));
  }

  private normalizeEpisodeType(type: string | undefined): string {
    const validTypes = ['FOUNDATIONAL', 'CORE', 'APPLICATION', 'INTEGRATION'];
    const normalized = (type || '').toUpperCase();
    return validTypes.includes(normalized) ? normalized : 'CORE';
  }

  private normalizeKeyPoints(points: any): any[] {
    if (!Array.isArray(points)) return [];

    return points.filter((p) => p != null).map((p) => ({
      point: p.point || p.text || '',
      purpose: this.normalizeKeyPointPurpose(p.purpose || p.type),
    }));
  }

  private normalizeKeyPointPurpose(purpose: string | undefined): string {
    const validPurposes = ['TOOL', 'DECISION', 'MISTAKE'];
    const normalized = (purpose || '').toUpperCase();
    return validPurposes.includes(normalized) ? normalized : 'TOOL';
  }

  private normalizePracticeConnection(conn: any): any {
    if (!conn) {
      return { context: '', behavior: '', difficulty: 'BASIC' };
    }

    return {
      context: conn.context || '',
      behavior: conn.behavior || '',
      difficulty: this.normalizeDifficulty(conn.difficulty),
    };
  }

  private normalizeDifficulty(difficulty: string | undefined): string {
    const validDifficulties = ['BASIC', 'INTERMEDIATE', 'ADVANCED'];
    const normalized = (difficulty || '').toUpperCase();
    return validDifficulties.includes(normalized) ? normalized : 'BASIC';
  }

  private normalizeSkillsSummary(skills: any): any {
    if (!skills) {
      return {
        foundational_skills: [],
        combined_skills: [],
        integrated_skills: [],
        total_skills_count: 0,
      };
    }

    const foundational = skills.foundational_skills || skills.foundationalSkills || [];
    const combined = skills.combined_skills || skills.combinedSkills || [];
    const integrated = skills.integrated_skills || skills.integratedSkills || [];

    return {
      foundational_skills: Array.isArray(foundational) ? foundational : [],
      combined_skills: Array.isArray(combined) ? combined : [],
      integrated_skills: Array.isArray(integrated) ? integrated : [],
      total_skills_count: skills.total_skills_count ?? skills.totalSkillsCount ?? 
        (foundational.length + combined.length + integrated.length),
    };
  }

  private normalizeQualityValidation(validation: any): any {
    if (!validation) {
      return {
        gates: [],
        overall: 'NEEDS_REVISION',
        revision_notes: 'Quality validation missing from response',
      };
    }

    return {
      gates: Array.isArray(validation.gates) ? validation.gates.map((g: any) => ({
        gate: g.gate || g.name || '',
        status: (g.status || 'FAIL').toUpperCase() === 'PASS' ? 'PASS' : 'FAIL',
        notes: g.notes || g.note || null,
      })) : [],
      overall: (validation.overall || validation.overallStatus || 'NEEDS_REVISION').toUpperCase() === 'ALL_PASS'
        ? 'ALL_PASS'
        : 'NEEDS_REVISION',
      revision_notes: validation.revision_notes || validation.revisionNotes || null,
    };
  }

  private buildS4InputData(outline: any): any {
    const episodes = this.normalizeEpisodes(outline.episodes);
    const skillsSummary = this.normalizeSkillsSummary(outline.skills_summary || outline.skillsSummary);

    return {
      course_title: outline.source_data?.idea_title || outline.sourceData?.ideaTitle || '',
      core_promise: outline.source_data?.core_promise || outline.sourceData?.corePromise || '',
      total_episodes: outline.course_parameters?.final_episode_count || 
        outline.courseParameters?.finalEpisodeCount || 
        episodes.length,
      episodes: episodes,
      skills_summary: skillsSummary,
    };
  }
}
