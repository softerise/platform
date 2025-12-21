import { Injectable, Logger } from '@nestjs/common';
import { StepType } from '@prisma/client';
import {
  IStepHandler,
  StepContext,
  StepOutput,
  StepPrompt,
  ValidationResult,
} from './step-handler.interface';
import { S4_PROMPT, S4PromptParams } from '../prompts/s4-episode-draft.prompt';
import { getS4Config, getS4ValidationThresholds } from '../prompts';
import { S4ResponseSchema } from './schemas/s4-response.schema';

@Injectable()
export class S4EpisodeDraftHandler implements IStepHandler {
  readonly stepType: StepType = StepType.S4_EPISODE_DRAFT;
  private readonly logger = new Logger(S4EpisodeDraftHandler.name);
  private readonly config = getS4Config();

  async buildPrompt(context: StepContext): Promise<StepPrompt> {
    const s3Output = context.previousStepOutputs[StepType.S3_COURSE_OUTLINE] as
      | StepOutput
      | undefined;

    if (!s3Output) {
      throw new Error('S3 output not found - S4 requires S3 completion');
    }

    if (!context.episodeNumber) {
      throw new Error('Episode number required for S4');
    }

    const s3Parsed = (s3Output as any)?.parsed ?? s3Output;

    const params: S4PromptParams = {
      s3OutlineData: s3Parsed,
      episodeNumber: context.episodeNumber,
    };

    return {
      systemPrompt: S4_PROMPT.systemPrompt,
      userPrompt: S4_PROMPT.buildUserPrompt(params),
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
        this.logger.error(`S4 JSON parse failed: ${parseError.message}`);
        this.logger.debug(`S4 raw response (first 500 chars): ${response.substring(0, 500)}`);
        return {
          valid: false,
          errors: [`JSON parse error: ${parseError.message}`],
        };
      }

      // Step 2: Debug logging
      const topLevelKeys = Object.keys(parsed || {});
      this.logger.debug(`S4 response top-level keys: ${topLevelKeys.join(', ')}`);

      // Step 3: Normalize response structure
      const normalized = this.normalizeResponse(parsed);

      if (!normalized) {
        this.logger.error('S4 response could not be normalized - missing episode_draft');
        return {
          valid: false,
          errors: ['Response missing episode_draft object'],
        };
      }

      // Step 4: Zod validation
      const result = S4ResponseSchema.safeParse(normalized);

      if (!result.success) {
        const zodErrors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        this.logger.warn(`S4 Zod validation failed: ${zodErrors.join('; ')}`);
        return {
          valid: false,
          errors: zodErrors,
        };
      }

      // Step 5: Business logic validation
      const data = result.data.episode_draft;
      const errors: string[] = [];

      // Debug logging for word count
      const wordCount = data.word_count_summary;
      this.logger.debug(
        `S4 Word count validation: total=${wordCount.total}, status=${wordCount.status}`,
      );

      // Check word count using config thresholds with tolerance
      const { actualMin, actualMax, targetMin, targetMax } = getS4ValidationThresholds();
      this.logger.debug(
        `S4 Word count thresholds: actualMin=${actualMin}, actualMax=${actualMax}, target=${targetMin}-${targetMax}`,
      );

      if (wordCount.total < actualMin) {
        errors.push(
          `Total word count ${wordCount.total} significantly under minimum (min: ${actualMin}, target: ${targetMin}-${targetMax})`,
        );
      }
      if (wordCount.total > actualMax) {
        errors.push(
          `Total word count ${wordCount.total} significantly over maximum (max: ${actualMax}, target: ${targetMin}-${targetMax})`,
        );
      }

      // Check quality gates
      if (data.quality_validation.overall_status !== 'ALL_PASS') {
        const failedGates = (data.quality_validation.gates || [])
          .filter((g) => g.status === 'FAIL')
          .map((g) => g.gate);
        if (failedGates.length > 0) {
          errors.push(`Quality gates failed: ${failedGates.join(', ')}`);
        }
      }

      // Check for script drift (Gate 6 - S4 should not contain conversational language)
      const scriptDriftGate = (data.quality_validation.gates || []).find(
        (g) => g.gate === 'No Script Drift',
      );
      if (scriptDriftGate && scriptDriftGate.status === 'FAIL') {
        errors.push('Script drift detected - S4 should not contain conversational language');
      }

      // Check key points expanded count
      const keyPointsExpanded = data.draft_content?.core_teaching?.key_points_expanded || [];
      if (keyPointsExpanded.length < 3) {
        errors.push(`Insufficient key points expanded: ${keyPointsExpanded.length} (minimum 3)`);
      }

      if (errors.length > 0) {
        return { valid: false, errors };
      }

      return { valid: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`S4 validation unexpected error: ${message}`);
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
      throw new Error('Cannot parse S4 response - missing episode_draft');
    }

    const data = normalized.episode_draft;

    return {
      raw: response,
      parsed: normalized,
      summary: {
        episodeNumber: data.metadata?.episode_number ?? 0,
        episodeTitle: data.metadata?.episode_title || 'Untitled',
        episodeType: data.metadata?.episode_type || 'CORE',
        totalWordCount: data.word_count_summary?.total ?? 0,
        wordCountStatus: data.word_count_summary?.status || 'UNKNOWN',
        qualityStatus: data.quality_validation?.overall_status || 'UNKNOWN',
        readyForS5: data.ready_for_s5 ?? false,
        keyPointsExpanded: data.draft_content?.core_teaching?.key_points_expanded?.length ?? 0,
        evidenceTextsUsed:
          (data.evidence_text_integration || []).filter(
            (e: { status: string }) => e.status === 'INTEGRATED',
          ).length ?? 0,
      },
    };
  }

  async onSuccess(context: StepContext, output: StepOutput): Promise<void> {
    this.logger.log(
      `S4 Episode ${output.summary.episodeNumber} draft completed: ` +
        `${output.summary.totalWordCount} words, ${output.summary.qualityStatus}`,
    );
  }

  /**
   * Normalize LLM response to expected schema structure.
   */
  private normalizeResponse(parsed: any): { episode_draft: any } | null {
    if (!parsed || typeof parsed !== 'object') {
      this.logger.warn('S4 normalizeResponse: parsed is null or not an object');
      return null;
    }

    // Case 1: Direct episode_draft at top level
    if (parsed.episode_draft && typeof parsed.episode_draft === 'object') {
      return { episode_draft: this.normalizeEpisodeDraft(parsed.episode_draft) };
    }

    // Case 2: camelCase version
    if (parsed.episodeDraft && typeof parsed.episodeDraft === 'object') {
      return { episode_draft: this.normalizeEpisodeDraft(parsed.episodeDraft) };
    }

    // Case 3: The response IS the episode_draft (no wrapper)
    if (parsed.metadata && parsed.draft_content) {
      return { episode_draft: this.normalizeEpisodeDraft(parsed) };
    }

    // Case 4: Nested under result/data
    const possibleKeys = ['result', 'data', 'response', 'draft'];
    for (const key of possibleKeys) {
      if (parsed[key] && typeof parsed[key] === 'object') {
        if (parsed[key].episode_draft) {
          return { episode_draft: this.normalizeEpisodeDraft(parsed[key].episode_draft) };
        }
        if (parsed[key].metadata && parsed[key].draft_content) {
          return { episode_draft: this.normalizeEpisodeDraft(parsed[key]) };
        }
      }
    }

    this.logger.warn(`S4 normalizeResponse: could not find episode_draft in keys: ${Object.keys(parsed).join(', ')}`);
    return null;
  }

  /**
   * Normalize episode_draft object - handle camelCase/snake_case variations
   */
  private normalizeEpisodeDraft(data: any): any {
    if (!data) return data;

    return {
      metadata: this.normalizeMetadata(data.metadata),
      s3_reference: this.normalizeS3Reference(data.s3_reference || data.s3Reference),
      draft_content: this.normalizeDraftContent(data.draft_content || data.draftContent),
      word_count_summary: this.normalizeWordCountSummary(data.word_count_summary || data.wordCountSummary),
      evidence_text_integration: this.normalizeEvidenceTextIntegration(
        data.evidence_text_integration || data.evidenceTextIntegration
      ),
      quality_validation: this.normalizeQualityValidation(data.quality_validation || data.qualityValidation),
      ready_for_s5: data.ready_for_s5 ?? data.readyForS5 ?? false,
      revision_notes: data.revision_notes || data.revisionNotes || null,
      s5_handoff: this.normalizeS5Handoff(data.s5_handoff || data.s5Handoff),
      processing_timestamp: data.processing_timestamp || data.processingTimestamp || new Date().toISOString(),
    };
  }

  private normalizeMetadata(metadata: any): any {
    if (!metadata) {
      return {
        episode_number: 0,
        episode_title: '',
        episode_type: 'CORE',
        total_episodes: 0,
        learning_objective: '',
        course_title: '',
      };
    }

    return {
      episode_number: metadata.episode_number ?? metadata.episodeNumber ?? 0,
      episode_title: metadata.episode_title || metadata.episodeTitle || '',
      episode_type: metadata.episode_type || metadata.episodeType || 'CORE',
      total_episodes: metadata.total_episodes ?? metadata.totalEpisodes ?? 0,
      learning_objective: metadata.learning_objective || metadata.learningObjective || '',
      course_title: metadata.course_title || metadata.courseTitle || '',
      target_persona: metadata.target_persona || metadata.targetPersona || undefined,
    };
  }

  private normalizeS3Reference(ref: any): any {
    if (!ref) {
      return {
        key_points: [],
        assigned_content: {
          strategies: [],
          methods: [],
          frameworks: [],
          research: [],
          stories: [],
          evidence_texts: [],
        },
      };
    }

    return {
      key_points: Array.isArray(ref.key_points || ref.keyPoints) 
        ? (ref.key_points || ref.keyPoints).map((kp: any) => ({
            point: kp.point || kp.text || '',
            purpose: kp.purpose || 'TOOL',
          }))
        : [],
      assigned_content: {
        strategies: ref.assigned_content?.strategies || ref.assignedContent?.strategies || [],
        methods: ref.assigned_content?.methods || ref.assignedContent?.methods || [],
        frameworks: ref.assigned_content?.frameworks || ref.assignedContent?.frameworks || [],
        research: ref.assigned_content?.research || ref.assignedContent?.research || [],
        stories: ref.assigned_content?.stories || ref.assignedContent?.stories || [],
        evidence_texts: ref.assigned_content?.evidence_texts || ref.assignedContent?.evidenceTexts || [],
      },
      foundational_micro_behavior: ref.foundational_micro_behavior || ref.foundationalMicroBehavior || undefined,
      practice_connection_hint: ref.practice_connection_hint || ref.practiceConnectionHint || undefined,
    };
  }

  private normalizeDraftContent(content: any): any {
    if (!content) {
      return {
        hook: { content: '', word_count: 0, evidence_texts_used: [], transition_hint: '' },
        core_teaching: {
          content: '',
          word_count: 0,
          key_points_expanded: [],
          content_integrated: { methods: [], frameworks: [], research: [] },
          evidence_texts_used: [],
          transition_hint: '',
        },
        application: {
          content: '',
          word_count: 0,
          stories_integrated: [],
          evidence_texts_used: [],
          transition_hint: '',
        },
        takeaway: { content: '', word_count: 0, evidence_texts_used: [] },
      };
    }

    return {
      hook: {
        content: content.hook?.content || '',
        word_count: content.hook?.word_count ?? content.hook?.wordCount ?? 0,
        evidence_texts_used: content.hook?.evidence_texts_used || content.hook?.evidenceTextsUsed || [],
        transition_hint: content.hook?.transition_hint || content.hook?.transitionHint || '',
      },
      core_teaching: {
        content: content.core_teaching?.content || content.coreTeaching?.content || '',
        word_count: content.core_teaching?.word_count ?? content.coreTeaching?.wordCount ?? 0,
        key_points_expanded: Array.isArray(content.core_teaching?.key_points_expanded || content.coreTeaching?.keyPointsExpanded)
          ? (content.core_teaching?.key_points_expanded || content.coreTeaching?.keyPointsExpanded)
          : [],
        content_integrated: content.core_teaching?.content_integrated || content.coreTeaching?.contentIntegrated || {
          methods: [],
          frameworks: [],
          research: [],
        },
        evidence_texts_used: content.core_teaching?.evidence_texts_used || content.coreTeaching?.evidenceTextsUsed || [],
        transition_hint: content.core_teaching?.transition_hint || content.coreTeaching?.transitionHint || '',
      },
      application: {
        content: content.application?.content || '',
        word_count: content.application?.word_count ?? content.application?.wordCount ?? 0,
        stories_integrated: content.application?.stories_integrated || content.application?.storiesIntegrated || [],
        evidence_texts_used: content.application?.evidence_texts_used || content.application?.evidenceTextsUsed || [],
        micro_behavior_included: content.application?.micro_behavior_included || content.application?.microBehaviorIncluded || undefined,
        transition_hint: content.application?.transition_hint || content.application?.transitionHint || '',
      },
      takeaway: {
        content: content.takeaway?.content || '',
        word_count: content.takeaway?.word_count ?? content.takeaway?.wordCount ?? 0,
        evidence_texts_used: content.takeaway?.evidence_texts_used || content.takeaway?.evidenceTextsUsed || [],
      },
    };
  }

  private normalizeWordCountSummary(summary: any): any {
    if (!summary) {
      return {
        hook: 0,
        core_teaching: 0,
        application: 0,
        takeaway: 0,
        total: 0,
        target_range: '725-1235',
        status: 'UNDER',
      };
    }

    return {
      hook: summary.hook ?? 0,
      core_teaching: summary.core_teaching ?? summary.coreTeaching ?? 0,
      application: summary.application ?? 0,
      takeaway: summary.takeaway ?? 0,
      total: summary.total ?? 0,
      target_range: summary.target_range || summary.targetRange || '725-1235',
      status: summary.status || 'UNDER',
    };
  }

  private normalizeEvidenceTextIntegration(integration: any): any[] {
    if (!Array.isArray(integration)) return [];

    return integration.filter((i) => i != null).map((i) => ({
      id: i.id || '',
      assigned_placement: i.assigned_placement || i.assignedPlacement || 'CORE',
      actual_placement: i.actual_placement || i.actualPlacement || 'CORE',
      full_markup: i.full_markup || i.fullMarkup || '',
      status: i.status || 'MISSING',
    }));
  }

  private normalizeQualityValidation(validation: any): any {
    if (!validation) {
      return {
        gates: [],
        overall_status: 'NEEDS_REVISION',
      };
    }

    return {
      gates: Array.isArray(validation.gates)
        ? validation.gates.map((g: any) => ({
            gate: g.gate || g.name || '',
            status: (g.status || 'FAIL').toUpperCase() === 'PASS' ? 'PASS' : 'FAIL',
            details: g.details || null,
            indicator_count: g.indicator_count ?? g.indicatorCount ?? undefined,
            instances: g.instances || undefined,
          }))
        : [],
      overall_status:
        (validation.overall_status || validation.overallStatus || 'NEEDS_REVISION').toUpperCase() === 'ALL_PASS'
          ? 'ALL_PASS'
          : 'NEEDS_REVISION',
    };
  }

  private normalizeS5Handoff(handoff: any): any {
    if (!handoff) {
      return {
        transition_hints: {
          hook_to_core: '',
          core_to_application: '',
          application_to_takeaway: '',
        },
        audio_emphasis_points: [],
        micro_behavior_format: null,
        total_word_count: 0,
      };
    }

    return {
      transition_hints: {
        hook_to_core: handoff.transition_hints?.hook_to_core || handoff.transitionHints?.hookToCore || '',
        core_to_application: handoff.transition_hints?.core_to_application || handoff.transitionHints?.coreToApplication || '',
        application_to_takeaway: handoff.transition_hints?.application_to_takeaway || handoff.transitionHints?.applicationToTakeaway || '',
      },
      audio_emphasis_points: handoff.audio_emphasis_points || handoff.audioEmphasisPoints || [],
      micro_behavior_format: handoff.micro_behavior_format || handoff.microBehaviorFormat || null,
      total_word_count: handoff.total_word_count ?? handoff.totalWordCount ?? 0,
    };
  }
}
