import { Injectable, Logger } from '@nestjs/common';
import { StepType } from '@prisma/client';
import {
  IStepHandler,
  StepContext,
  StepOutput,
  StepPrompt,
  ValidationResult,
} from './step-handler.interface';
import { S5_PROMPT, S5PromptParams } from '../prompts/s5-episode-content.prompt';
import { getS5Config, getS5ValidationThresholds } from '../prompts';
import { S5ResponseSchema } from './schemas/s5-response.schema';

@Injectable()
export class S5EpisodeContentHandler implements IStepHandler {
  readonly stepType: StepType = StepType.S5_EPISODE_CONTENT;
  private readonly logger = new Logger(S5EpisodeContentHandler.name);
  private readonly config = getS5Config();

  async buildPrompt(context: StepContext): Promise<StepPrompt> {
    // Debug logging for input validation
    this.logger.debug(`S5 buildPrompt called for episode ${context.episodeNumber}`);
    this.logger.debug(
      `S5 previousStepOutputs keys: ${JSON.stringify(Object.keys(context.previousStepOutputs || {}))}`,
    );

    const s4Output = this.getS4OutputForEpisode(context);

    if (!s4Output) {
      this.logger.error(`S5 missing S4 output for episode ${context.episodeNumber}`);
      this.logger.error(
        `S5 S4_EPISODE_DRAFT data: ${JSON.stringify(
          context.previousStepOutputs[StepType.S4_EPISODE_DRAFT] ? 'exists' : 'null',
        )}`,
      );
      throw new Error(`S4 output not found for episode ${context.episodeNumber}`);
    }

    if (!context.episodeNumber) {
      throw new Error('Episode number required for S5');
    }

    const s4Parsed = (s4Output as any)?.parsed ?? s4Output;
    this.logger.debug(`S5 s4Parsed keys: ${JSON.stringify(Object.keys(s4Parsed || {}))}`);

    // Validate S4 draft content exists
    const draftContent =
      s4Parsed?.episode_draft?.draft_content ?? s4Parsed?.draft_content ?? null;
    if (!draftContent) {
      this.logger.error(`S5 missing draft_content in S4 output`);
      this.logger.error(`S5 s4Parsed structure: ${JSON.stringify(Object.keys(s4Parsed || {}))}`);
      throw new Error('S5 requires draft_content from S4 output');
    }

    const params: S5PromptParams = {
      s4DraftData: s4Parsed,
      episodeNumber: context.episodeNumber,
    };

    return {
      systemPrompt: S5_PROMPT.systemPrompt,
      userPrompt: S5_PROMPT.buildUserPrompt(params),
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
        this.logger.error(`S5 JSON parse failed: ${parseError.message}`);
        this.logger.debug(`S5 raw response (first 500 chars): ${response.substring(0, 500)}`);
        return {
          valid: false,
          errors: [`JSON parse error: ${parseError.message}`],
        };
      }

      // Step 2: Debug logging
      const topLevelKeys = Object.keys(parsed || {});
      this.logger.debug(`S5 response top-level keys: ${topLevelKeys.join(', ')}`);

      // Step 3: Normalize response structure
      const normalized = this.normalizeResponse(parsed);

      if (!normalized) {
        this.logger.error('S5 response could not be normalized - missing episode_content');
        return {
          valid: false,
          errors: ['Response missing episode_content object'],
        };
      }

      // Step 4: Zod validation
      const result = S5ResponseSchema.safeParse(normalized);

      if (!result.success) {
        const zodErrors = result.error.issues.map((e) => `${String(e.path.join('.'))}: ${e.message}`);
        this.logger.warn(`S5 Zod validation failed: ${zodErrors.join('; ')}`);
        return {
          valid: false,
          errors: zodErrors,
        };
      }

      // Step 5: Business logic validation
      const data = result.data.episode_content;
      const errors: string[] = [];

      // Word count validation using config thresholds with tolerance
      const { targetMin, targetMax } = getS5ValidationThresholds();
      const wordCount = data.word_count_summary;

      // Use more lenient thresholds for total word count (35% tolerance)
      const TOTAL_TOLERANCE = 0.35;
      const lenientMin = Math.floor(targetMin * (1 - TOTAL_TOLERANCE)); // ~484
      const lenientMax = Math.ceil(targetMax * (1 + TOTAL_TOLERANCE)); // ~1749

      this.logger.debug(
        `S5 Word count validation: total=${wordCount.total}, status=${wordCount.status}`,
      );
      this.logger.debug(
        `S5 Word count thresholds: lenientMin=${lenientMin}, lenientMax=${lenientMax}, target=${targetMin}-${targetMax}`,
      );

      // Word count validation - WARNING ONLY, never fails
      // This is intentionally lenient to accommodate LLM content generation variability
      const wordCountWarnings: string[] = [];

      if (wordCount.total < lenientMin) {
        wordCountWarnings.push(`Total: ${wordCount.total} < ${lenientMin}`);
      } else if (wordCount.total > lenientMax) {
        wordCountWarnings.push(`Total: ${wordCount.total} > ${lenientMax}`);
      }

      const script = data.audio_script;

      // Section checks - all warnings only
      if (script.hook.word_count < 40) {
        wordCountWarnings.push(`Hook: ${script.hook.word_count} < 40`);
      }
      if (script.core_teaching.word_count < 150) {
        wordCountWarnings.push(`Core: ${script.core_teaching.word_count} < 150`);
      }
      if (script.application.word_count < 50) {
        wordCountWarnings.push(`Application: ${script.application.word_count} < 50`);
      }
      if (script.takeaway.word_count < 20) {
        wordCountWarnings.push(`Takeaway: ${script.takeaway.word_count} < 20`);
      }

      // Log all word count issues as warnings - NEVER FAIL
      if (wordCountWarnings.length > 0) {
        this.logger.warn(`S5 Word count warnings (non-blocking): ${wordCountWarnings.join('; ')}`);
      } else {
        this.logger.log(`S5 Word count PASS: ${wordCount.total} words`);
      }

      // Check quality gates - EXCLUDE Word Count gate (handled separately with lenient validation)
      if (data.quality_validation.overall_status !== 'ALL_PASS') {
        const failedGates = (data.quality_validation.gates || [])
          .filter((g) => g.status === 'FAIL')
          .filter((g) => !g.gate?.toLowerCase().includes('word count')) // Skip word count gate
          .map((g) => g.gate);
        if (failedGates.length > 0) {
          errors.push(`Quality gates failed: ${failedGates.join(', ')}`);
        }
      }

      // Check content fidelity
      const fidelityGate = (data.quality_validation.gates || []).find(
        (g) => g.gate === 'Content Fidelity',
      );
      if (fidelityGate && fidelityGate.status === 'FAIL') {
        errors.push('Content fidelity failed - S5 must preserve all S4 content');
      }

      // Check conversational boundary
      const boundaryGate = (data.quality_validation.gates || []).find(
        (g) => g.gate === 'Conversational Boundary',
      );
      if (boundaryGate && boundaryGate.status === 'FAIL') {
        errors.push('Conversational boundary violated - check for casual openers or hype');
      }

      // Check audio monotony
      const monotonyGate = (data.quality_validation.gates || []).find(
        (g) => g.gate === 'Audio Monotony',
      );
      if (monotonyGate && monotonyGate.status === 'FAIL') {
        errors.push('Audio monotony detected - add variation in sentence lengths and section openings');
      }

      // Check transitions word count - WARNING ONLY
      const transitionsTotal = data.word_count_summary.transitions_total ?? 0;
      if (transitionsTotal < 10 || transitionsTotal > 100) {
        this.logger.warn(`S5 Transitions word count ${transitionsTotal} outside expected range (warning only)`);
      }

      // Check no new information in takeaway
      if (script.takeaway.new_information_added) {
        errors.push('Takeaway should not add new information');
      }

      // Check key points delivered
      const keyPointsDelivered = script.core_teaching.key_points_delivered || [];
      const unconfirmedPoints = keyPointsDelivered.filter((kp) => !kp.confirmed);
      if (unconfirmedPoints.length > 0) {
        errors.push(
          `Key points not confirmed delivered: ${unconfirmedPoints.map((p) => p.point).join(', ')}`,
        );
      }

      if (errors.length > 0) {
        return { valid: false, errors };
      }

      return { valid: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`S5 validation unexpected error: ${message}`);
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
      throw new Error('Cannot parse S5 response - missing episode_content');
    }

    const data = normalized.episode_content;

    return {
      raw: response,
      parsed: normalized,
      summary: {
        episodeNumber: data.metadata?.episode_number ?? 0,
        episodeTitle: data.metadata?.episode_title || 'Untitled',
        episodeType: data.metadata?.episode_type || 'CORE',
        totalWordCount: data.word_count_summary?.total ?? 0,
        estimatedDuration: data.production_output?.estimated_duration_minutes ?? 0,
        qualityStatus: data.quality_validation?.overall_status || 'UNKNOWN',
        readyForProduction: data.ready_for_production ?? false,
        platformPersonaMaintained: data.production_output?.platform_persona_maintained ?? false,
        pauseMarkers: data.production_output?.marker_summary?.pause_count ?? 0,
        emphasisMarkers: data.production_output?.marker_summary?.emphasis_count ?? 0,
        textContent: data.production_output?.text_content || '',
      },
    };
  }

  async onSuccess(context: StepContext, output: StepOutput): Promise<void> {
    this.logger.log(
      `S5 Episode ${output.summary.episodeNumber} script completed: ` +
      `${output.summary.totalWordCount} words, ~${output.summary.estimatedDuration} min`,
    );
  }

  private getS4OutputForEpisode(context: StepContext): StepOutput | null {
    const s4Outputs = context.previousStepOutputs[StepType.S4_EPISODE_DRAFT];

    this.logger.debug(`S5 getS4OutputForEpisode: looking for episode ${context.episodeNumber}`);
    this.logger.debug(`S5 getS4OutputForEpisode: s4Outputs type=${typeof s4Outputs}, isArray=${Array.isArray(s4Outputs)}`);

    if (!s4Outputs) {
      this.logger.warn(`S5 getS4OutputForEpisode: no S4 outputs found in context`);
      return null;
    }

    // If it's an array of episode outputs, find the matching one
    if (Array.isArray(s4Outputs)) {
      this.logger.debug(`S5 getS4OutputForEpisode: searching in array of ${s4Outputs.length} outputs`);

      const found = s4Outputs.find((o: any) => {
        const summaryEp = o.summary?.episodeNumber;
        const parsedEp = o.parsed?.episode_draft?.metadata?.episode_number;
        this.logger.debug(`S5 getS4OutputForEpisode: checking output - summaryEp=${summaryEp}, parsedEp=${parsedEp}`);
        return summaryEp === context.episodeNumber || parsedEp === context.episodeNumber;
      });

      if (found) {
        this.logger.debug(`S5 getS4OutputForEpisode: found matching output for episode ${context.episodeNumber}`);
      } else {
        this.logger.warn(`S5 getS4OutputForEpisode: no matching output found in array for episode ${context.episodeNumber}`);
      }

      return (found as StepOutput) ?? null;
    }

    // If single output, check episode number matches
    const output = s4Outputs as any;
    const summaryEp = output?.summary?.episodeNumber;
    const parsedEp = output?.parsed?.episode_draft?.metadata?.episode_number;

    this.logger.debug(`S5 getS4OutputForEpisode: single output - summaryEp=${summaryEp}, parsedEp=${parsedEp}`);

    if (summaryEp === context.episodeNumber || parsedEp === context.episodeNumber) {
      this.logger.debug(`S5 getS4OutputForEpisode: single output matches episode ${context.episodeNumber}`);
      return s4Outputs as StepOutput;
    }

    return null;
  }

  /**
   * Normalize LLM response to expected schema structure.
   */
  private normalizeResponse(parsed: any): { episode_content: any } | null {
    if (!parsed || typeof parsed !== 'object') {
      this.logger.warn('S5 normalizeResponse: parsed is null or not an object');
      return null;
    }

    // Case 1: Direct episode_content at top level
    if (parsed.episode_content && typeof parsed.episode_content === 'object') {
      return { episode_content: this.normalizeEpisodeContent(parsed.episode_content) };
    }

    // Case 2: camelCase version
    if (parsed.episodeContent && typeof parsed.episodeContent === 'object') {
      return { episode_content: this.normalizeEpisodeContent(parsed.episodeContent) };
    }

    // Case 3: The response IS the episode_content (no wrapper)
    if (parsed.metadata && parsed.audio_script) {
      return { episode_content: this.normalizeEpisodeContent(parsed) };
    }

    // Case 4: Nested under result/data
    const possibleKeys = ['result', 'data', 'response', 'content', 'script'];
    for (const key of possibleKeys) {
      if (parsed[key] && typeof parsed[key] === 'object') {
        if (parsed[key].episode_content) {
          return { episode_content: this.normalizeEpisodeContent(parsed[key].episode_content) };
        }
        if (parsed[key].metadata && parsed[key].audio_script) {
          return { episode_content: this.normalizeEpisodeContent(parsed[key]) };
        }
      }
    }

    this.logger.warn(`S5 normalizeResponse: could not find episode_content in keys: ${Object.keys(parsed).join(', ')}`);
    return null;
  }

  /**
   * Normalize episode_content object - handle camelCase/snake_case variations
   */
  private normalizeEpisodeContent(data: any): any {
    if (!data) return data;

    return {
      metadata: this.normalizeMetadata(data.metadata),
      style_analysis: this.normalizeStyleAnalysis(data.style_analysis || data.styleAnalysis),
      audio_script: this.normalizeAudioScript(data.audio_script || data.audioScript),
      evidence_texts_delivered: this.normalizeEvidenceTextsDelivered(
        data.evidence_texts_delivered || data.evidenceTextsDelivered
      ),
      word_count_summary: this.normalizeWordCountSummary(data.word_count_summary || data.wordCountSummary),
      quality_validation: this.normalizeQualityValidation(data.quality_validation || data.qualityValidation),
      production_output: this.normalizeProductionOutput(data.production_output || data.productionOutput),
      ready_for_production: data.ready_for_production ?? data.readyForProduction ?? false,
      revision_notes: data.revision_notes || data.revisionNotes || null,
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
    };
  }

  private normalizeStyleAnalysis(analysis: any): any {
    if (!analysis) {
      return {
        detected_signals: {
          sentence_length: 'MEDIUM',
          explanation_style: 'BALANCED',
          tone: 'WARM',
          rhythm: 'VARIED',
        },
        platform_conflicts: [],
        application_notes: '',
      };
    }

    const signals = analysis.detected_signals || analysis.detectedSignals || {};
    return {
      detected_signals: {
        sentence_length: signals.sentence_length || signals.sentenceLength || 'MEDIUM',
        explanation_style: signals.explanation_style || signals.explanationStyle || 'BALANCED',
        tone: signals.tone || 'WARM',
        rhythm: signals.rhythm || 'VARIED',
      },
      platform_conflicts: Array.isArray(analysis.platform_conflicts || analysis.platformConflicts)
        ? (analysis.platform_conflicts || analysis.platformConflicts)
        : [],
      application_notes: analysis.application_notes || analysis.applicationNotes || '',
    };
  }

  private normalizeAudioScript(script: any): any {
    if (!script) {
      return {
        hook: { content: '', word_count: 0, opening_style: 'SITUATION' },
        transition_hook_to_core: { content: '', word_count: 0 },
        core_teaching: { content: '', word_count: 0, key_points_delivered: [], pause_markers_used: 0 },
        transition_core_to_application: { content: '', word_count: 0 },
        application: { content: '', word_count: 0, story_delivered: false, micro_behavior: { included: false } },
        transition_application_to_takeaway: { content: '', word_count: 0 },
        takeaway: { content: '', word_count: 0, new_information_added: false },
        practice_bridge: { content: '', word_count: 0 },
      };
    }

    return {
      hook: {
        content: script.hook?.content || '',
        word_count: script.hook?.word_count ?? script.hook?.wordCount ?? 0,
        opening_style: script.hook?.opening_style || script.hook?.openingStyle || 'SITUATION',
      },
      transition_hook_to_core: {
        content: script.transition_hook_to_core?.content || script.transitionHookToCore?.content || '',
        word_count: script.transition_hook_to_core?.word_count ?? script.transitionHookToCore?.wordCount ?? 0,
      },
      core_teaching: {
        content: script.core_teaching?.content || script.coreTeaching?.content || '',
        word_count: script.core_teaching?.word_count ?? script.coreTeaching?.wordCount ?? 0,
        key_points_delivered: Array.isArray(script.core_teaching?.key_points_delivered || script.coreTeaching?.keyPointsDelivered)
          ? (script.core_teaching?.key_points_delivered || script.coreTeaching?.keyPointsDelivered).map((kp: any) => ({
            point: kp.point || '',
            purpose: kp.purpose || 'TOOL',
            confirmed: kp.confirmed ?? true,
          }))
          : [],
        pause_markers_used: script.core_teaching?.pause_markers_used ?? script.coreTeaching?.pauseMarkersUsed ?? 0,
      },
      transition_core_to_application: {
        content: script.transition_core_to_application?.content || script.transitionCoreToApplication?.content || '',
        word_count: script.transition_core_to_application?.word_count ?? script.transitionCoreToApplication?.wordCount ?? 0,
      },
      application: {
        content: script.application?.content || '',
        word_count: script.application?.word_count ?? script.application?.wordCount ?? 0,
        story_delivered: script.application?.story_delivered ?? script.application?.storyDelivered ?? false,
        micro_behavior: {
          included: script.application?.micro_behavior?.included ?? script.application?.microBehavior?.included ?? false,
          try_this: script.application?.micro_behavior?.try_this || script.application?.microBehavior?.tryThis || null,
          notice_this: script.application?.micro_behavior?.notice_this || script.application?.microBehavior?.noticeThis || null,
          ask_yourself: script.application?.micro_behavior?.ask_yourself || script.application?.microBehavior?.askYourself || null,
        },
      },
      transition_application_to_takeaway: {
        content: script.transition_application_to_takeaway?.content || script.transitionApplicationToTakeaway?.content || '',
        word_count: script.transition_application_to_takeaway?.word_count ?? script.transitionApplicationToTakeaway?.wordCount ?? 0,
      },
      takeaway: {
        content: script.takeaway?.content || '',
        word_count: script.takeaway?.word_count ?? script.takeaway?.wordCount ?? 0,
        new_information_added: script.takeaway?.new_information_added ?? script.takeaway?.newInformationAdded ?? false,
      },
      practice_bridge: {
        content: script.practice_bridge?.content || script.practiceBridge?.content || '',
        word_count: script.practice_bridge?.word_count ?? script.practiceBridge?.wordCount ?? 0,
      },
    };
  }

  private normalizeEvidenceTextsDelivered(texts: any): any[] {
    if (!Array.isArray(texts)) return [];

    return texts.filter((t) => t != null).map((t) => ({
      id: t.id || '',
      placement: t.placement || 'CORE',
      full_delivery: t.full_delivery || t.fullDelivery || '',
      format_compliant: t.format_compliant ?? t.formatCompliant ?? true,
    }));
  }

  private normalizeWordCountSummary(summary: any): any {
    if (!summary) {
      return {
        hook: 0,
        transitions_total: 0,
        core_teaching: 0,
        application: 0,
        takeaway: 0,
        practice_bridge: 0,
        total: 0,
        status: 'UNDER',
      };
    }

    return {
      hook: summary.hook ?? 0,
      transitions_total: summary.transitions_total ?? summary.transitionsTotal ?? 0,
      core_teaching: summary.core_teaching ?? summary.coreTeaching ?? 0,
      application: summary.application ?? 0,
      takeaway: summary.takeaway ?? 0,
      practice_bridge: summary.practice_bridge ?? summary.practiceBridge ?? 0,
      total: summary.total ?? 0,
      status: summary.status || 'UNDER',
    };
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
          avg_sentence_length: g.avg_sentence_length ?? g.avgSentenceLength ?? undefined,
          issues: g.issues || undefined,
          we_count: g.we_count ?? g.weCount ?? undefined,
          you_count: g.you_count ?? g.youCount ?? undefined,
          rhythm: g.rhythm || undefined,
          violations: g.violations ?? undefined,
        }))
        : [],
      overall_status:
        (validation.overall_status || validation.overallStatus || 'NEEDS_REVISION').toUpperCase() === 'ALL_PASS'
          ? 'ALL_PASS'
          : 'NEEDS_REVISION',
    };
  }

  private normalizeProductionOutput(output: any): any {
    if (!output) {
      return {
        text_content: '',
        total_word_count: 0,
        estimated_duration_minutes: 0,
        marker_summary: { pause_count: 0, emphasis_count: 0 },
        platform_persona_maintained: false,
      };
    }

    return {
      text_content: output.text_content || output.textContent || '',
      total_word_count: output.total_word_count ?? output.totalWordCount ?? 0,
      estimated_duration_minutes: output.estimated_duration_minutes ?? output.estimatedDurationMinutes ?? 0,
      marker_summary: {
        pause_count: output.marker_summary?.pause_count ?? output.markerSummary?.pauseCount ?? 0,
        emphasis_count: output.marker_summary?.emphasis_count ?? output.markerSummary?.emphasisCount ?? 0,
      },
      platform_persona_maintained: output.platform_persona_maintained ?? output.platformPersonaMaintained ?? false,
    };
  }
}
