import { Injectable, Logger } from '@nestjs/common';
import { StepType } from '@prisma/client';
import {
  IStepHandler,
  StepContext,
  StepOutput,
  StepPrompt,
  ValidationResult,
} from './step-handler.interface';
import { S2_PROMPT, S2PromptParams } from '../prompts/s2-idea-inspiration.prompt';
import { getS2Config } from '../prompts';
import { S2ResponseSchema } from './schemas/s2-response.schema';

@Injectable()
export class S2IdeaInspirationHandler implements IStepHandler {
  readonly stepType: StepType = StepType.S2_IDEA_INSPIRATION;
  private readonly logger = new Logger(S2IdeaInspirationHandler.name);
  private readonly config = getS2Config();

  async buildPrompt(context: StepContext): Promise<StepPrompt> {
    const s1FromSteps = context.previousStepOutputs[StepType.S1_BOOK_VERIFICATION] as
      | StepOutput
      | undefined;
    const s1Raw = (s1FromSteps as any)?.parsed ?? context.book.s1Output;

    const params: S2PromptParams = {
      bookTitle: context.book.title,
      bookDescription: context.book.description,
      s1VerificationData: this.buildS1Data(s1Raw, context),
    };

    return {
      systemPrompt: S2_PROMPT.systemPrompt,
      userPrompt: S2_PROMPT.buildUserPrompt(params),
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
        this.logger.error(`S2 JSON parse failed: ${parseError.message}`);
        this.logger.debug(`S2 raw response (first 500 chars): ${response.substring(0, 500)}`);
        return {
          valid: false,
          errors: [`JSON parse error: ${parseError.message}`],
        };
      }

      // Step 2: Debug logging
      const topLevelKeys = Object.keys(parsed || {});
      this.logger.debug(`S2 response top-level keys: ${topLevelKeys.join(', ')}`);

      // Step 3: Normalize response structure
      const normalized = this.normalizeResponse(parsed);

      if (!normalized) {
        this.logger.error('S2 response could not be normalized - missing idea_inspiration');
        return {
          valid: false,
          errors: ['Response missing idea_inspiration object'],
        };
      }

      // Step 4: Zod validation
      const result = S2ResponseSchema.safeParse(normalized);

      if (!result.success) {
        const zodErrors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        this.logger.warn(`S2 Zod validation failed: ${zodErrors.join('; ')}`);
        return {
          valid: false,
          errors: zodErrors,
        };
      }

      // Step 5: Business logic validation
      const data = result.data.idea_inspiration;
      const generatedIdeas = data.generated_ideas || [];

      const hasValidIdea = generatedIdeas.some(
        (idea) => idea.verdict === 'DIAMOND_IDEA' || idea.verdict === 'GOLD_IDEA',
      );

      if (!hasValidIdea && data.proceed_to_s3) {
        return {
          valid: false,
          errors: ['proceed_to_s3 is true but no DIAMOND or GOLD ideas exist'],
        };
      }

      return { valid: true };
    } catch (error: any) {
      this.logger.error(`S2 validation unexpected error: ${error.message}`, error.stack);
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
      throw new Error('Cannot parse S2 response - missing idea_inspiration');
    }

    const data = normalized.idea_inspiration;
    const topIdea = data.recommendation || {};

    return {
      raw: response,
      parsed: normalized,
      summary: {
        topIdeaId: topIdea.top_idea_id || '',
        topIdeaTitle: topIdea.top_idea_title || '',
        topIdeaScore: topIdea.top_idea_score ?? 0,
        topIdeaVerdict: topIdea.top_idea_verdict || 'UNKNOWN',
        totalIdeas: data.ideas_summary?.total_generated ?? 0,
        diamondIdeas: data.ideas_summary?.diamond_ideas ?? 0,
        goldIdeas: data.ideas_summary?.gold_ideas ?? 0,
        proceedToS3: data.proceed_to_s3 ?? false,
        whyThisIdeaWins: topIdea.why_this_idea_wins || '',
      },
    };
  }

  async onSuccess(context: StepContext, output: StepOutput): Promise<void> {
    this.logger.log(`S2 completed for pipeline ${context.pipelineRunId}`);
    this.logger.log(`Top idea: ${output.summary.topIdeaTitle} (${output.summary.topIdeaVerdict})`);
  }

  private buildS1Data(raw: any, context: StepContext): S2PromptParams['s1VerificationData'] {
    if (
      raw &&
      typeof raw === 'object' &&
      raw.final_evaluation &&
      raw.s2_input_data &&
      raw.spi_mapping
    ) {
      return raw as S2PromptParams['s1VerificationData'];
    }

    return {
      final_evaluation: {
        verdict: (context.book.s1Verdict as string | undefined) ?? 'GOLD',
        verdict_confidence: (context.book.s1VerdictConfidence as string | undefined) ?? 'MEDIUM',
      },
      s2_input_data: {
        behavioral_impact_statement: (raw as any)?.behavioral_impact_statement ?? '',
        primary_spi_focus: context.book.s1PrimarySpiName ?? '',
        content_uniqueness: 'CURATED_COMPILATION',
      },
      spi_mapping: {
        primary_spi_id:
          (context.book.s1PrimarySpiId as any) ??
          (raw as any)?.primary_spi_id ??
          (raw as any)?.spi_mapping?.primary_spi_id ??
          1,
      },
    };
  }

  /**
   * Normalize LLM response to expected schema structure.
   * Handles both direct idea_inspiration and nested variations.
   */
  private normalizeResponse(parsed: any): { idea_inspiration: any } | null {
    if (!parsed || typeof parsed !== 'object') {
      this.logger.warn('S2 normalizeResponse: parsed is null or not an object');
      return null;
    }

    // Case 1: Direct idea_inspiration at top level
    if (parsed.idea_inspiration && typeof parsed.idea_inspiration === 'object') {
      return { idea_inspiration: this.normalizeIdeaInspiration(parsed.idea_inspiration) };
    }

    // Case 2: The response IS the idea_inspiration (no wrapper)
    if (parsed.source_book && parsed.generated_ideas) {
      return { idea_inspiration: this.normalizeIdeaInspiration(parsed) };
    }

    // Case 3: Nested under different key (camelCase)
    if (parsed.ideaInspiration && typeof parsed.ideaInspiration === 'object') {
      return { idea_inspiration: this.normalizeIdeaInspiration(parsed.ideaInspiration) };
    }

    // Case 4: Nested under result/data
    const possibleKeys = ['result', 'data', 'response'];
    for (const key of possibleKeys) {
      if (parsed[key] && typeof parsed[key] === 'object') {
        if (parsed[key].idea_inspiration) {
          return { idea_inspiration: this.normalizeIdeaInspiration(parsed[key].idea_inspiration) };
        }
        if (parsed[key].source_book || parsed[key].generated_ideas) {
          return { idea_inspiration: this.normalizeIdeaInspiration(parsed[key]) };
        }
      }
    }

    this.logger.warn(`S2 normalizeResponse: could not find idea_inspiration in keys: ${Object.keys(parsed).join(', ')}`);
    return null;
  }

  /**
   * Normalize idea_inspiration object - handle camelCase/snake_case variations
   */
  private normalizeIdeaInspiration(data: any): any {
    if (!data) return data;

    return {
      source_book: this.normalizeSourceBook(data.source_book || data.sourceBook),
      idea_quota: this.normalizeIdeaQuota(data.idea_quota || data.ideaQuota),
      generated_ideas: this.normalizeGeneratedIdeas(data.generated_ideas || data.generatedIdeas),
      ideas_summary: this.normalizeIdeasSummary(data.ideas_summary || data.ideasSummary),
      recommendation: this.normalizeRecommendation(data.recommendation),
      proceed_to_s3: data.proceed_to_s3 ?? data.proceedToS3 ?? false,
      s3_input_data: data.s3_input_data || data.s3InputData || {},
    };
  }

  private normalizeSourceBook(source: any): any {
    if (!source) {
      return {
        title: '',
        book_title: '',
        s1_verdict: 'GOLD',
        s1_verdict_confidence: 'MEDIUM',
      };
    }

    return {
      title: source.title || source.book_title || source.bookTitle || '',
      book_title: source.book_title || source.bookTitle || source.title || '',
      s1_verdict: source.s1_verdict || source.s1Verdict || 'GOLD',
      s1_verdict_confidence: source.s1_verdict_confidence || source.s1VerdictConfidence || 'MEDIUM',
    };
  }

  private normalizeIdeaQuota(quota: any): any {
    if (!quota) {
      return {
        determined_quota: 3,
        quota_rationale: 'Default quota',
        diamond_allowed: 3,
        gold_allowed: 3,
        silver_allowed: 3,
        bronze_max: 2,
      };
    }

    return {
      determined_quota: quota.determined_quota ?? quota.determinedQuota ?? 3,
      quota_rationale: quota.quota_rationale || quota.quotaRationale || '',
      diamond_allowed: quota.diamond_allowed ?? quota.diamondAllowed ?? 3,
      gold_allowed: quota.gold_allowed ?? quota.goldAllowed ?? 3,
      silver_allowed: quota.silver_allowed ?? quota.silverAllowed ?? 3,
      bronze_max: quota.bronze_max ?? quota.bronzeMax ?? 2,
    };
  }

  private normalizeGeneratedIdeas(ideas: any): any[] {
    if (!Array.isArray(ideas)) {
      this.logger.warn(`S2 normalizeGeneratedIdeas: ideas is not an array, got ${typeof ideas}`);
      return [];
    }

    return ideas.filter((idea) => idea != null).map((idea, index) => ({
      idea_id: idea.idea_id || idea.ideaId || `IDEA_${index + 1}`,
      idea_title: idea.idea_title || idea.ideaTitle || idea.title || `Idea ${index + 1}`,
      core_promise: idea.core_promise || idea.corePromise || '',
      s1_alignment: idea.s1_alignment || idea.s1Alignment || 'ALIGNED',
      target_persona: this.normalizeTargetPersona(idea.target_persona || idea.targetPersona),
      pain_points: this.normalizePainPoints(idea.pain_points || idea.painPoints),
      unique_angle: idea.unique_angle || idea.uniqueAngle || {},
      practice_validation: idea.practice_validation || idea.practiceValidation || {},
      scoring: this.normalizeScoring(idea.scoring),
      verdict: this.normalizeVerdict(idea.verdict),
      verdict_rationale: idea.verdict_rationale || idea.verdictRationale || '',
      verdict_justification: idea.verdict_justification || idea.verdictJustification || '',
    }));
  }

  private normalizeTargetPersona(persona: any): any {
    if (!persona) {
      return {
        who: '',
        level: 'MID_LEVEL',
        situation: '',
        struggle: '',
        desired_outcome: '',
        persona_unique: false,
      };
    }

    return {
      who: persona.who || '',
      level: persona.level || 'MID_LEVEL',
      situation: persona.situation || '',
      struggle: persona.struggle || '',
      desired_outcome: persona.desired_outcome || persona.desiredOutcome || '',
      persona_unique: persona.persona_unique ?? persona.personaUnique ?? false,
    };
  }

  private normalizePainPoints(painPoints: any): any[] {
    if (!Array.isArray(painPoints)) {
      return [];
    }

    return painPoints.filter((p) => p != null).map((p, index) => ({
      id: p.id ?? index + 1,
      context: p.context || '',
      behavioral_failure: p.behavioral_failure || p.behavioralFailure || '',
      full_statement: p.full_statement || p.fullStatement || '',
    }));
  }

  private normalizeScoring(scoring: any): any {
    if (!scoring) {
      return {
        engagement_potential: { score: 0, max: 30 },
        actionability: { score: 0, max: 25, practice_check: 'PASS' },
        differentiation: { score: 0, max: 20 },
        micro_learning_fit: { score: 0, max: 15 },
        production_feasibility: { score: 0, max: 10 },
        total_score: 0,
      };
    }

    return {
      engagement_potential: scoring.engagement_potential || scoring.engagementPotential || { score: 0, max: 30 },
      actionability: scoring.actionability || { score: 0, max: 25, practice_check: 'PASS' },
      differentiation: scoring.differentiation || { score: 0, max: 20 },
      micro_learning_fit: scoring.micro_learning_fit || scoring.microLearningFit || { score: 0, max: 15 },
      production_feasibility: scoring.production_feasibility || scoring.productionFeasibility || { score: 0, max: 10 },
      total_score: scoring.total_score ?? scoring.totalScore ?? 0,
      dimensions: Array.isArray(scoring.dimensions) ? scoring.dimensions : [],
    };
  }

  private normalizeVerdict(verdict: string | undefined): string {
    const validVerdicts = ['DIAMOND_IDEA', 'GOLD_IDEA', 'SILVER_IDEA', 'BRONZE_IDEA', 'REJECT'];
    const normalized = (verdict || '').toUpperCase().replace(/ /g, '_');
    return validVerdicts.includes(normalized) ? normalized : 'BRONZE_IDEA';
  }

  private normalizeIdeasSummary(summary: any): any {
    if (!summary) {
      return {
        total_generated: 0,
        diamond_ideas: 0,
        gold_ideas: 0,
        silver_ideas: 0,
        bronze_ideas: 0,
        rejected: 0,
      };
    }

    return {
      total_generated: summary.total_generated ?? summary.totalGenerated ?? 0,
      diamond_ideas: summary.diamond_ideas ?? summary.diamondIdeas ?? 0,
      gold_ideas: summary.gold_ideas ?? summary.goldIdeas ?? 0,
      silver_ideas: summary.silver_ideas ?? summary.silverIdeas ?? 0,
      bronze_ideas: summary.bronze_ideas ?? summary.bronzeIdeas ?? 0,
      rejected: summary.rejected ?? 0,
    };
  }

  private normalizeRecommendation(rec: any): any {
    if (!rec) {
      return {
        top_idea_id: '',
        top_idea_title: '',
        top_idea_score: 0,
        top_idea_verdict: 'UNKNOWN',
        why_this_idea_wins: '',
        runner_up: null,
      };
    }

    return {
      top_idea_id: rec.top_idea_id || rec.topIdeaId || '',
      top_idea_title: rec.top_idea_title || rec.topIdeaTitle || '',
      top_idea_score: rec.top_idea_score ?? rec.topIdeaScore ?? 0,
      top_idea_verdict: rec.top_idea_verdict || rec.topIdeaVerdict || 'UNKNOWN',
      why_this_idea_wins: rec.why_this_idea_wins || rec.whyThisIdeaWins || '',
      runner_up: rec.runner_up || rec.runnerUp || null,
    };
  }
}
