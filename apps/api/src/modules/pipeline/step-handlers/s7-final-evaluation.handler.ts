import { Injectable, Logger } from '@nestjs/common';
import { StepType } from '@prisma/client';
import {
  IStepHandler,
  StepContext,
  StepOutput,
  StepPrompt,
  ValidationResult,
} from './step-handler.interface';
import { S7_PROMPT, S7PromptParams } from '../prompts/s7-final-evaluation.prompt';
import { getS7Config, S7_SCORE_THRESHOLDS } from '../prompts/s7.config';
import { S7ResponseSchema } from './schemas/s7-response.schema';

@Injectable()
export class S7FinalEvaluationHandler implements IStepHandler {
  readonly stepType: StepType = StepType.S7_FINAL_EVALUATION;
  private readonly logger = new Logger(S7FinalEvaluationHandler.name);
  private readonly config = getS7Config();

  async buildPrompt(context: StepContext): Promise<StepPrompt> {
    this.logger.debug('S7 buildPrompt called for final evaluation');
    this.logger.debug(
      `S7 previousStepOutputs keys: ${JSON.stringify(Object.keys(context.previousStepOutputs || {}))}`,
    );

    // Get S1 data from Book entity
    const s1BookVerification = context.book.s1Output;
    if (!s1BookVerification) {
      this.logger.warn('S7 missing S1 book verification - using book metadata');
    }

    // Get S2 output
    const s2Output = context.previousStepOutputs[StepType.S2_IDEA_INSPIRATION];
    if (!s2Output) {
      throw new Error('S2 idea inspiration required for S7 final evaluation');
    }

    // Get S3 output
    const s3Output = context.previousStepOutputs[StepType.S3_COURSE_OUTLINE];
    if (!s3Output) {
      throw new Error('S3 course outline required for S7 final evaluation');
    }

    // Get ALL S4 episode outputs
    const s4Outputs = this.aggregateEpisodeOutputs(context, StepType.S4_EPISODE_DRAFT);
    if (s4Outputs.length === 0) {
      throw new Error('S4 episode drafts required for S7 final evaluation');
    }

    // Get ALL S5 episode outputs
    const s5Outputs = this.aggregateEpisodeOutputs(context, StepType.S5_EPISODE_CONTENT);
    if (s5Outputs.length === 0) {
      throw new Error('S5 episode content required for S7 final evaluation');
    }

    // Get ALL S6 practice level outputs (BASIC, INTERMEDIATE, ADVANCED)
    const s6Outputs = this.aggregatePracticeLevelOutputs(context);
    if (s6Outputs.length === 0) {
      throw new Error('S6 practice content required for S7 final evaluation');
    }
    this.logger.debug(`S7 found ${s6Outputs.length} S6 practice level outputs`);

    this.logger.debug(
      `S7 context: S4=${s4Outputs.length} episodes, S5=${s5Outputs.length} episodes`,
    );

    // Extract course metadata
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

    const totalEpisodes =
      courseOutline?.course_parameters?.final_episode_count ||
      courseOutline?.s4_input_data?.total_episodes ||
      s5Outputs.length;

    // Determine S1 confidence
    const s1Confidence = this.getS1Confidence(context, s1BookVerification);

    // Build target persona
    const targetPersona = this.buildTargetPersona(courseOutline?.source_data?.target_persona);

    const params: S7PromptParams = {
      s1BookVerification: s1BookVerification || this.buildS1Fallback(context),
      s2IdeaInspiration: (s2Output as any)?.parsed ?? s2Output,
      s3OutlineContent: s3Parsed,
      s4DraftContents: s4Outputs.map((o) => (o as any)?.parsed ?? o),
      s5EpisodeContents: s5Outputs.map((o) => (o as any)?.parsed ?? o),
      s6PracticeContent: this.mergeS6LevelOutputs(s6Outputs),
      courseMetadata: {
        courseTitle,
        sourceBook: context.book.title,
        corePromise,
        totalEpisodes,
        s1Confidence,
        targetPersona,
      },
    };

    return {
      systemPrompt: S7_PROMPT.systemPrompt,
      userPrompt: S7_PROMPT.buildUserPrompt(params),
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
        this.logger.error(`S7 JSON parse failed: ${parseError.message}`);
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
          errors: ['Response missing final_evaluation object'],
        };
      }

      // Step 3: Zod validation
      const result = S7ResponseSchema.safeParse(normalized);
      if (!result.success) {
        const zodErrors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        this.logger.warn(`S7 Zod validation failed: ${zodErrors.join('; ')}`);
        return {
          valid: false,
          errors: zodErrors,
        };
      }

      // Step 4: Business logic validation
      const data = result.data.final_evaluation;
      const errors: string[] = [];

      // Check 6 critical gates evaluated
      if (data.critical_gates.gates.length !== 6) {
        errors.push(`Expected 6 critical gates, got ${data.critical_gates.gates.length}`);
      }

      // Check verdict consistency with gates
      const allGatesPassed = data.critical_gates.summary.all_passed;
      const verdict = data.final_verdict.verdict;

      if (!allGatesPassed) {
        // If any gate failed, verdict must be REVISION_REQUIRED or REJECTED
        if (verdict === 'APPROVED' || verdict === 'APPROVED_WITH_NOTES') {
          errors.push(
            `Verdict is ${verdict} but not all critical gates passed (${data.critical_gates.summary.total_failed} failed)`,
          );
        }

        // Quality scores should not be evaluated if gates failed
        if (data.quality_scores.evaluated) {
          errors.push('Quality scores should not be evaluated when gates fail');
        }
      }

      // If gates pass, check quality scores
      if (allGatesPassed && data.quality_scores.evaluated) {
        const score = data.quality_scores.total_score ?? 0;
        const threshold = data.quality_scores.threshold_applied ?? S7_SCORE_THRESHOLDS.standard;

        // Check verdict consistency with score
        if (score < threshold - 20) {
          // Score significantly below threshold
          if (verdict === 'APPROVED' || verdict === 'APPROVED_WITH_NOTES') {
            errors.push(
              `Verdict is ${verdict} but score ${score} is significantly below threshold ${threshold}`,
            );
          }
        }

        // Check dimension scores sum to total
        if (data.quality_scores.dimensions) {
          const dims = data.quality_scores.dimensions;
          const summedScore =
            (dims.content_engagement?.score ?? 0) +
            (dims.pedagogical_soundness?.score ?? 0) +
            (dims.practice_effectiveness?.score ?? 0) +
            (dims.production_polish?.score ?? 0);

          if (Math.abs(summedScore - score) > 1) {
            errors.push(
              `Quality score mismatch: dimensions sum to ${summedScore} but total_score is ${score}`,
            );
          }
        }
      }

      // If REVISION_REQUIRED, must have issues
      if (verdict === 'REVISION_REQUIRED') {
        if (!data.revision_guidance.applicable) {
          errors.push('REVISION_REQUIRED verdict requires revision_guidance.applicable = true');
        }
        const issues = data.revision_guidance.issues ?? [];
        if (issues.length === 0) {
          errors.push('REVISION_REQUIRED verdict requires at least one issue in revision_guidance');
        }
      }

      // If APPROVED_WITH_NOTES with borderline score, notes must be documented
      if (verdict === 'APPROVED_WITH_NOTES') {
        const isBorderline = data.quality_scores.is_borderline ?? false;
        if (isBorderline && !data.notes_documentation.applicable) {
          errors.push(
            'APPROVED_WITH_NOTES with borderline score requires notes_documentation.applicable = true',
          );
        }
      }

      // Check 6 cross-reference checks
      if (data.cross_reference_checks.checks.length !== 6) {
        errors.push(
          `Expected 6 cross-reference checks, got ${data.cross_reference_checks.checks.length}`,
        );
      }

      // Check deployment_ready consistency
      if (verdict === 'APPROVED' || verdict === 'APPROVED_WITH_NOTES') {
        if (!data.final_verdict.deployment_ready) {
          errors.push(`Verdict is ${verdict} but deployment_ready is false`);
        }
      } else {
        if (data.final_verdict.deployment_ready) {
          errors.push(`Verdict is ${verdict} but deployment_ready is true`);
        }
      }

      // Check post-launch monitoring consistency
      if (data.post_launch_monitoring.flagged && data.post_launch_monitoring.flag_reasons.length === 0) {
        errors.push('Post-launch monitoring flagged but no flag_reasons provided');
      }

      if (errors.length > 0) {
        return { valid: false, errors };
      }

      return { valid: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`S7 validation unexpected error: ${message}`);
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
      throw new Error('Cannot parse S7 response - missing final_evaluation');
    }

    const data = normalized.final_evaluation;

    return {
      raw: response,
      parsed: normalized,
      summary: {
        courseTitle: data.course_summary.course_title,
        sourceBook: data.course_summary.source_book,
        totalEpisodes: data.course_summary.total_episodes,
        totalPracticeSessions: data.course_summary.total_practice_sessions,
        s1Confidence: data.confidence_inheritance.s1_confidence_level,
        appliedThreshold: data.confidence_inheritance.applied_threshold,
        verdict: data.final_verdict.verdict,
        verdictReasoning: data.final_verdict.verdict_reasoning,
        deploymentReady: data.final_verdict.deployment_ready,
        confidence: data.final_verdict.confidence,
        criticalGatesPassed: data.critical_gates.summary.all_passed,
        gatesSummary: {
          totalPassed: data.critical_gates.summary.total_passed,
          totalFailed: data.critical_gates.summary.total_failed,
          failedGates: data.critical_gates.summary.failed_gates,
        },
        qualityScoreEvaluated: data.quality_scores.evaluated,
        totalScore: data.quality_scores.total_score ?? null,
        thresholdApplied: data.quality_scores.threshold_applied ?? null,
        isBorderline: data.quality_scores.is_borderline ?? false,
        crossReferencesStatus: data.cross_reference_checks.status,
        highConcernCount: data.cross_reference_checks.high_concern_count,
        samplingPerformed: data.targeted_sampling.performed,
        samplingStatus: data.targeted_sampling.status,
        samplingImpact: data.targeted_sampling.impact,
        postLaunchFlagged: data.post_launch_monitoring.flagged,
        revisionGuidanceApplicable: data.revision_guidance.applicable,
        notesApplicable: data.notes_documentation.applicable,
      },
    };
  }

  async onSuccess(context: StepContext, output: StepOutput): Promise<void> {
    const verdict = output.summary.verdict;
    const score = output.summary.totalScore;

    this.logger.log(
      `S7 Final evaluation completed: verdict=${verdict}, score=${score ?? 'N/A'}, ` +
        `deployment_ready=${output.summary.deploymentReady}, confidence=${output.summary.confidence}`,
    );

    // Log gate results
    if (!output.summary.criticalGatesPassed) {
      this.logger.warn(
        `S7 Critical gates failed: ${output.summary.gatesSummary?.failedGates?.join(', ') || 'unknown'}`,
      );
    }

    // Log if needs human attention
    if (output.summary.postLaunchFlagged) {
      this.logger.warn('S7 Course flagged for post-launch monitoring');
    }

    // Note: Orchestrator will handle WAITING_REVIEW status transition based on verdict
    if (verdict === 'APPROVED' || verdict === 'APPROVED_WITH_NOTES') {
      this.logger.log('S7 Course ready for human review approval');
    } else if (verdict === 'REVISION_REQUIRED') {
      this.logger.warn('S7 Course requires revision before human review');
    } else if (verdict === 'REJECTED') {
      this.logger.error('S7 Course rejected - fundamental issues found');
    }
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
      // Sort by episode number
      return outputs.sort((a: any, b: any) => {
        const aEp = a.episodeNumber ?? a.summary?.episodeNumber ?? 0;
        const bEp = b.episodeNumber ?? b.summary?.episodeNumber ?? 0;
        return aEp - bEp;
      });
    }

    // Single output
    return [outputs];
  }

  /**
   * Aggregate all S6 practice level outputs
   */
  private aggregatePracticeLevelOutputs(context: StepContext): unknown[] {
    const outputs = context.previousStepOutputs[StepType.S6_PRACTICE_CONTENT];

    if (!outputs) {
      return [];
    }

    if (Array.isArray(outputs)) {
      // Sort by level number (1=BASIC, 2=INTERMEDIATE, 3=ADVANCED)
      return outputs.sort((a: any, b: any) => {
        const aLevel = a.summary?.levelNumber ?? a.episodeNumber ?? 0;
        const bLevel = b.summary?.levelNumber ?? b.episodeNumber ?? 0;
        return aLevel - bLevel;
      });
    }

    // Single output
    return [outputs];
  }

  /**
   * Merge S6 level outputs into a unified practice_content structure
   */
  private mergeS6LevelOutputs(s6Outputs: unknown[]): any {
    // Collect all practice sessions from all levels
    const allSessions: any[] = [];
    const allSkills = new Set<string>();
    let courseMetadata: any = null;

    for (const output of s6Outputs) {
      const parsed = (output as any)?.parsed ?? output;
      const content = parsed?.practice_level_content ?? parsed?.practice_content ?? parsed;
      
      if (content?.practice_sessions) {
        allSessions.push(...content.practice_sessions);
      }
      
      if (content?.skills_for_level?.skills_tested) {
        content.skills_for_level.skills_tested.forEach((s: string) => allSkills.add(s));
      }
      
      if (content?.course_metadata && !courseMetadata) {
        courseMetadata = content.course_metadata;
      }
    }

    // Return merged structure compatible with old S6 format
    return {
      practice_content: {
        course_metadata: courseMetadata || {
          course_title: '',
          core_promise: '',
          target_persona: { who: '', struggle: '', desired_outcome: '' },
        },
        skills_inventory: {
          total_skills_to_cover: allSkills.size,
          all_skills: Array.from(allSkills),
        },
        practice_sessions: allSessions,
        statistics: {
          total_practice_sessions: allSessions.length,
          total_questions: allSessions.reduce((sum, s) => sum + (s.questions?.length || 0), 0),
          total_answer_options: allSessions.reduce(
            (sum, s) => sum + (s.questions?.reduce((qSum: number, q: any) => qSum + (q.answers?.length || 0), 0) || 0),
            0
          ),
        },
        ready_for_production: true,
      },
    };
  }

  /**
   * Get S1 confidence level from context
   */
  private getS1Confidence(context: StepContext, s1Output: unknown): string {
    // Try from book entity first
    if (context.book.s1VerdictConfidence) {
      return context.book.s1VerdictConfidence;
    }

    // Try from S1 output
    const s1Data = s1Output as any;
    if (s1Data?.verdict_confidence || s1Data?.verdictConfidence) {
      return s1Data.verdict_confidence || s1Data.verdictConfidence;
    }
    if (s1Data?.book_evaluation?.verdict_confidence) {
      return s1Data.book_evaluation.verdict_confidence;
    }

    // Default to MEDIUM
    return 'MEDIUM';
  }

  /**
   * Build target persona object
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
   * Build fallback S1 data from book entity
   */
  private buildS1Fallback(context: StepContext): object {
    return {
      book_title: context.book.title,
      verdict: context.book.s1Verdict || 'UNKNOWN',
      verdict_confidence: context.book.s1VerdictConfidence || 'MEDIUM',
      primary_spi_id: context.book.s1PrimarySpiId,
      primary_spi_name: context.book.s1PrimarySpiName,
    };
  }

  /**
   * Normalize LLM response to expected schema structure
   */
  private normalizeResponse(parsed: any): { final_evaluation: any } | null {
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    // Case 1: Direct final_evaluation at top level
    if (parsed.final_evaluation && typeof parsed.final_evaluation === 'object') {
      return { final_evaluation: this.normalizeFinalEvaluation(parsed.final_evaluation) };
    }

    // Case 2: camelCase version
    if (parsed.finalEvaluation && typeof parsed.finalEvaluation === 'object') {
      return { final_evaluation: this.normalizeFinalEvaluation(parsed.finalEvaluation) };
    }

    // Case 3: The response IS the final_evaluation (no wrapper)
    if (parsed.critical_gates && parsed.final_verdict) {
      return { final_evaluation: this.normalizeFinalEvaluation(parsed) };
    }

    // Case 4: Nested under result/data
    const possibleKeys = ['result', 'data', 'response', 'evaluation'];
    for (const key of possibleKeys) {
      if (parsed[key] && typeof parsed[key] === 'object') {
        if (parsed[key].final_evaluation) {
          return {
            final_evaluation: this.normalizeFinalEvaluation(parsed[key].final_evaluation),
          };
        }
        if (parsed[key].critical_gates && parsed[key].final_verdict) {
          return { final_evaluation: this.normalizeFinalEvaluation(parsed[key]) };
        }
      }
    }

    this.logger.warn(
      `S7 normalizeResponse: could not find final_evaluation in keys: ${Object.keys(parsed).join(', ')}`,
    );
    return null;
  }

  /**
   * Normalize final evaluation object to match new schema
   */
  private normalizeFinalEvaluation(data: any): any {
    if (!data) return data;

    return {
      course_summary: this.normalizeCourseSummary(data.course_summary || data.courseSummary),
      confidence_inheritance: this.normalizeConfidenceInheritance(
        data.confidence_inheritance || data.confidenceInheritance,
      ),
      critical_gates: this.normalizeCriticalGates(data.critical_gates || data.criticalGates),
      quality_scores: this.normalizeQualityScores(data.quality_scores || data.qualityScores),
      cross_reference_checks: this.normalizeCrossReferenceChecks(
        data.cross_reference_checks || data.crossReferenceChecks,
      ),
      targeted_sampling: this.normalizeTargetedSampling(
        data.targeted_sampling || data.targetedSampling,
      ),
      final_verdict: this.normalizeFinalVerdict(data.final_verdict || data.finalVerdict),
      post_launch_monitoring: this.normalizePostLaunchMonitoring(
        data.post_launch_monitoring || data.postLaunchMonitoring,
      ),
      revision_guidance: this.normalizeRevisionGuidance(
        data.revision_guidance || data.revisionGuidance,
      ),
      notes_documentation: this.normalizeNotesDocumentation(
        data.notes_documentation || data.notesDocumentation,
      ),
      evaluation_metadata: {
        timestamp:
          data.evaluation_metadata?.timestamp ||
          data.evaluationMetadata?.timestamp ||
          new Date().toISOString(),
        pipeline_version:
          data.evaluation_metadata?.pipeline_version ||
          data.evaluationMetadata?.pipelineVersion ||
          '1.1',
      },
    };
  }

  private normalizeCourseSummary(summary: any): any {
    if (!summary) {
      return {
        course_title: '',
        source_book: '',
        total_episodes: 0,
        total_practice_sessions: 9,
        target_persona: { who: '', struggle: '', desired_outcome: '' },
        s1_behavioral_impact: '',
        s2_core_promise: '',
        s2_why_this_idea_wins: '',
      };
    }

    const persona = summary.target_persona || summary.targetPersona || {};

    return {
      course_title: summary.course_title || summary.courseTitle || '',
      source_book: summary.source_book || summary.sourceBook || '',
      total_episodes: summary.total_episodes ?? summary.totalEpisodes ?? 0,
      total_practice_sessions: summary.total_practice_sessions ?? summary.totalPracticeSessions ?? 9,
      target_persona: {
        who: persona.who || '',
        struggle: persona.struggle || '',
        desired_outcome: persona.desired_outcome || persona.desiredOutcome || '',
      },
      s1_behavioral_impact: summary.s1_behavioral_impact || summary.s1BehavioralImpact || '',
      s2_core_promise: summary.s2_core_promise || summary.s2CorePromise || '',
      s2_why_this_idea_wins: summary.s2_why_this_idea_wins || summary.s2WhyThisIdeaWins || '',
    };
  }

  private normalizeConfidenceInheritance(inheritance: any): any {
    if (!inheritance) {
      return {
        s1_confidence_level: 'MEDIUM',
        applied_threshold: 'STANDARD_80',
        scrutiny_notes: '',
      };
    }

    return {
      s1_confidence_level:
        inheritance.s1_confidence_level || inheritance.s1ConfidenceLevel || 'MEDIUM',
      applied_threshold:
        inheritance.applied_threshold || inheritance.appliedThreshold || 'STANDARD_80',
      scrutiny_notes: inheritance.scrutiny_notes || inheritance.scrutinyNotes || '',
    };
  }

  private normalizeCriticalGates(gates: any): any {
    if (!gates) {
      return {
        gates: [],
        summary: { total_passed: 0, total_failed: 0, all_passed: false, failed_gates: [] },
      };
    }

    const normalizedGates = (gates.gates || []).map((g: any, index: number) => ({
      gate_number: g.gate_number ?? g.gateNumber ?? index + 1,
      gate_name: g.gate_name || g.gateName || g.gate || '',
      result: (g.result || g.status || 'FAIL').toUpperCase() === 'PASS' ? 'PASS' : 'FAIL',
      evidence: g.evidence || g.details || '',
      fail_reason: g.fail_reason || g.failReason || null,
      objectives_covered: g.objectives_covered ?? g.objectivesCovered,
      objectives_total: g.objectives_total ?? g.objectivesTotal,
      key_points_preserved: g.key_points_preserved ?? g.keyPointsPreserved,
      key_points_total: g.key_points_total ?? g.keyPointsTotal,
      skills_practiced: g.skills_practiced ?? g.skillsPracticed,
      skills_taught: g.skills_taught ?? g.skillsTaught,
      one_sentence_test: g.one_sentence_test || g.oneSentenceTest,
    }));

    const passedCount = normalizedGates.filter((g: any) => g.result === 'PASS').length;
    const failedCount = normalizedGates.filter((g: any) => g.result === 'FAIL').length;
    const failedGates = normalizedGates
      .filter((g: any) => g.result === 'FAIL')
      .map((g: any) => g.gate_name);

    return {
      gates: normalizedGates,
      summary: {
        total_passed: gates.summary?.total_passed ?? gates.summary?.totalPassed ?? passedCount,
        total_failed: gates.summary?.total_failed ?? gates.summary?.totalFailed ?? failedCount,
        all_passed: gates.summary?.all_passed ?? gates.summary?.allPassed ?? failedCount === 0,
        failed_gates: gates.summary?.failed_gates || gates.summary?.failedGates || failedGates,
      },
    };
  }

  private normalizeQualityScores(scores: any): any {
    if (!scores) {
      return { evaluated: false, skip_reason: null };
    }

    const normalized: any = {
      evaluated: scores.evaluated ?? false,
      skip_reason: scores.skip_reason || scores.skipReason || null,
    };

    if (scores.evaluated && scores.dimensions) {
      normalized.dimensions = this.normalizeQualityDimensions(scores.dimensions);
      normalized.total_score = scores.total_score ?? scores.totalScore ?? 0;
      normalized.threshold_applied = scores.threshold_applied ?? scores.thresholdApplied ?? 80;
      normalized.is_borderline = scores.is_borderline ?? scores.isBorderline ?? false;
      normalized.score_verdict = scores.score_verdict || scores.scoreVerdict || '';
    }

    return normalized;
  }

  private normalizeQualityDimensions(dims: any): any {
    const normalizeDim = (dim: any, defaults: any) => {
      if (!dim) return { score: 0, max: 25, breakdown: defaults, notes: '' };

      return {
        score: dim.score ?? 0,
        max: 25,
        breakdown: {
          ...defaults,
          ...Object.fromEntries(
            Object.entries(dim.breakdown || {}).map(([k, v]) => [
              k.replace(/([A-Z])/g, '_$1').toLowerCase(),
              v,
            ]),
          ),
        },
        notes: dim.notes || '',
      };
    };

    return {
      content_engagement: normalizeDim(dims.content_engagement || dims.contentEngagement, {
        hooks: 0,
        flow_rhythm: 0,
        memorability: 0,
        engagement_maintenance: 0,
      }),
      pedagogical_soundness: normalizeDim(dims.pedagogical_soundness || dims.pedagogicalSoundness, {
        learning_arc: 0,
        concept_clarity: 0,
        skill_building: 0,
        reinforcement: 0,
      }),
      practice_effectiveness: normalizeDim(dims.practice_effectiveness || dims.practiceEffectiveness, {
        scenario_realism: 0,
        question_quality: 0,
        answer_design: 0,
        feedback_quality: 0,
      }),
      production_polish: normalizeDim(dims.production_polish || dims.productionPolish, {
        completeness: 0,
        consistency: 0,
        format_compliance: 0,
        professional_quality: 0,
      }),
    };
  }

  private normalizeCrossReferenceChecks(checks: any): any {
    if (!checks) {
      return { checks: [], status: 'ALL_CLEAR', high_concern_count: 0 };
    }

    const normalizedChecks = (checks.checks || []).map((c: any) => ({
      check: c.check || c.check_id || c.checkId || '',
      result: c.result || c.status || 'ALIGNED',
      concern_level: c.concern_level || c.concernLevel || 'LOW',
      notes: c.notes || c.details || '',
    }));

    const highConcernCount = normalizedChecks.filter(
      (c: any) => c.concern_level === 'HIGH',
    ).length;

    return {
      checks: normalizedChecks,
      status: checks.status || (highConcernCount > 0 ? 'CONCERNS_NOTED' : 'ALL_CLEAR'),
      high_concern_count: checks.high_concern_count ?? checks.highConcernCount ?? highConcernCount,
    };
  }

  private normalizeTargetedSampling(sampling: any): any {
    if (!sampling) {
      return {
        performed: false,
        mandatory: false,
        status: 'ALL_ACCEPTABLE',
        impact: 'NONE',
      };
    }

    const normalized: any = {
      performed: sampling.performed ?? false,
      mandatory: sampling.mandatory ?? false,
      status: sampling.status || 'ALL_ACCEPTABLE',
      impact: sampling.impact || 'NONE',
    };

    if (sampling.samples) {
      normalized.samples = {
        weak_episode: sampling.samples.weak_episode || sampling.samples.weakEpisode || {
          episode_number: 0,
          episode_title: '',
          assessment: 'ACCEPTABLE',
          one_sentence_test: 'PASS',
          findings: '',
        },
        advanced_practice: sampling.samples.advanced_practice || sampling.samples.advancedPractice || {
          practice_id: '',
          assessment: 'ACCEPTABLE',
          findings: '',
        },
        s4_s5_transformation: sampling.samples.s4_s5_transformation || sampling.samples.s4S5Transformation || {
          episode_number: 0,
          assessment: 'ACCEPTABLE',
          findings: '',
        },
      };
    }

    return normalized;
  }

  private normalizeFinalVerdict(verdict: any): any {
    if (!verdict) {
      return {
        verdict: 'REVISION_REQUIRED',
        verdict_reasoning: '',
        deployment_ready: false,
        confidence: 'LOW',
      };
    }

    return {
      verdict: verdict.verdict || 'REVISION_REQUIRED',
      verdict_reasoning: verdict.verdict_reasoning || verdict.verdictReasoning || verdict.summary || '',
      deployment_ready: verdict.deployment_ready ?? verdict.deploymentReady ?? false,
      confidence: verdict.confidence || 'LOW',
    };
  }

  private normalizePostLaunchMonitoring(monitoring: any): any {
    if (!monitoring) {
      return { flagged: false, flag_reasons: [], monitoring_actions: [] };
    }

    return {
      flagged: monitoring.flagged ?? false,
      flag_reasons: monitoring.flag_reasons || monitoring.flagReasons || [],
      monitoring_actions: monitoring.monitoring_actions || monitoring.monitoringActions || [],
    };
  }

  private normalizeRevisionGuidance(guidance: any): any {
    if (!guidance) {
      return { applicable: false };
    }

    const normalized: any = {
      applicable: guidance.applicable ?? false,
    };

    if (guidance.issues && Array.isArray(guidance.issues)) {
      normalized.issues = guidance.issues.map((issue: any) => ({
        priority: issue.priority ?? 1,
        description: issue.description || '',
        step_to_revise: issue.step_to_revise || issue.stepToRevise || issue.affected_step || 'S5',
        specific_fix: issue.specific_fix || issue.specificFix || issue.suggested_fix || '',
        downstream_impact: issue.downstream_impact || issue.downstreamImpact || '',
      }));
    }

    if (guidance.revision_loop || guidance.revisionLoop) {
      const loop = guidance.revision_loop || guidance.revisionLoop;
      normalized.revision_loop = {
        start_from: loop.start_from || loop.startFrom || '',
        steps_to_rerun: loop.steps_to_rerun || loop.stepsToRerun || [],
        return_to: 'S7',
      };
    }

    if (guidance.do_not_change || guidance.doNotChange) {
      normalized.do_not_change = guidance.do_not_change || guidance.doNotChange;
    }

    return normalized;
  }

  private normalizeNotesDocumentation(notes: any): any {
    if (!notes) {
      return { applicable: false, mandatory: false };
    }

    const normalized: any = {
      applicable: notes.applicable ?? false,
      mandatory: notes.mandatory ?? false,
    };

    if (notes.notes && Array.isArray(notes.notes)) {
      normalized.notes = notes.notes.map((note: any) => ({
        observation: note.observation || '',
        severity: note.severity || 'MINOR',
        recommendation: note.recommendation || '',
      }));
    }

    return normalized;
  }
}
