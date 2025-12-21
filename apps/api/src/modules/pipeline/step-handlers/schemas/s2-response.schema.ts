import { z } from 'zod';

const IdeaVerdictSchema = z.enum(['DIAMOND_IDEA', 'GOLD_IDEA', 'SILVER_IDEA', 'BRONZE_IDEA', 'REJECTED_IDEA', 'REJECT']);

// More lenient target persona schema
const TargetPersonaSchema = z.object({
  who: z.string(),
  level: z.string().optional(), // Was enum, now string for flexibility
  situation: z.string().optional(),
  struggle: z.string().optional(),
  desired_outcome: z.string().optional(),
  persona_unique: z.boolean().optional(),
}).passthrough(); // Allow additional properties

// More lenient pain point schema
const PainPointSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  context: z.string().optional(),
  behavioral_failure: z.string().optional(),
  full_statement: z.string().optional(),
}).passthrough();

// More lenient unique angle schema
const UniqueAngleSchema = z.object({
  book_framework_used: z.string().optional(),
  differentiation: z.string().optional(),
  only_from_this_book: z.string().optional(),
}).passthrough();

// More lenient practice validation schema  
const PracticeValidationSchema = z.object({
  basic_scenario: z.string().optional(),
  intermediate_scenario: z.string().optional(),
  advanced_scenario: z.string().optional(),
  validation_result: z.string().optional(), // Was enum, now string
}).passthrough();

// More lenient scoring dimension
const ScoringDimensionSchema = z.object({
  score: z.number().optional(),
  max: z.number().optional(),
  practice_check: z.string().optional(),
}).passthrough();

// More lenient scoring schema
const ScoringSchema = z.object({
  engagement_potential: ScoringDimensionSchema.optional(),
  actionability: ScoringDimensionSchema.optional(),
  differentiation: ScoringDimensionSchema.optional(),
  micro_learning_fit: ScoringDimensionSchema.optional(),
  production_feasibility: ScoringDimensionSchema.optional(),
  total_score: z.number().optional(),
  dimensions: z.array(z.any()).optional(),
}).passthrough();

// More lenient generated idea schema
const GeneratedIdeaSchema = z.object({
  idea_id: z.string(),
  idea_title: z.string(),
  core_promise: z.string().optional(),
  s1_alignment: z.string().optional(), // Was enum, now string
  target_persona: TargetPersonaSchema.optional(),
  pain_points: z.array(PainPointSchema).optional().default([]),
  unique_angle: UniqueAngleSchema.optional(),
  practice_validation: PracticeValidationSchema.optional(),
  scoring: ScoringSchema.optional(),
  verdict: IdeaVerdictSchema,
  verdict_rationale: z.string().optional(),
  verdict_justification: z.string().optional(),
}).passthrough();

// Source book schema - more lenient
const SourceBookSchema = z.object({
  title: z.string().optional(),
  book_title: z.string().optional(), // Alternative key
  s1_verdict: z.string().optional(),
  s1_verdict_confidence: z.string().optional(),
}).passthrough();

// Idea quota schema - more lenient
const IdeaQuotaSchema = z.object({
  determined_quota: z.number().optional(),
  quota_rationale: z.string().optional(),
  diamond_allowed: z.number().optional(),
  gold_allowed: z.number().optional(),
  silver_allowed: z.number().optional(),
  bronze_max: z.number().optional(),
}).passthrough();

// Ideas summary schema - more lenient
const IdeasSummarySchema = z.object({
  total_generated: z.number().optional().default(0),
  diamond_ideas: z.number().optional().default(0),
  gold_ideas: z.number().optional().default(0),
  silver_ideas: z.number().optional().default(0),
  bronze_ideas: z.number().optional().default(0),
  rejected_ideas: z.number().optional().default(0),
  rejected: z.number().optional().default(0),
}).passthrough();

// Recommendation schema - more lenient
const RecommendationSchema = z.object({
  top_idea_id: z.string().optional().default(''),
  top_idea_title: z.string().optional().default(''),
  top_idea_score: z.number().optional().default(0),
  top_idea_verdict: z.string().optional().default(''),
  why_this_idea_wins: z.string().optional().default(''),
}).passthrough();

// S3 input data schema - very lenient
const S3InputDataSchema = z.object({
  selected_idea_id: z.string().optional(),
  idea_title: z.string().optional(),
  core_promise: z.string().optional(),
  target_persona: z.any().optional(),
  pain_points: z.array(z.any()).optional().default([]),
  unique_angle: z.any().optional(),
  practice_scenarios_preview: z.any().optional(),
}).passthrough();

export const S2ResponseSchema = z.object({
  idea_inspiration: z.object({
    source_book: SourceBookSchema.optional(),
    idea_quota: IdeaQuotaSchema.optional(),
    generated_ideas: z.array(GeneratedIdeaSchema).min(1),
    ideas_summary: IdeasSummarySchema.optional(),
    recommendation: RecommendationSchema.optional(),
    proceed_to_s3: z.boolean().optional().default(false),
    s3_input_data: S3InputDataSchema.optional(),
  }).passthrough(),
});

export type S2Response = z.infer<typeof S2ResponseSchema>;
