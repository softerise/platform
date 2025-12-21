import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

const FinalVerdictTypeSchema = z.enum([
  'APPROVED',
  'APPROVED_WITH_NOTES',
  'REVISION_REQUIRED',
  'REJECTED',
]);

const GateResultSchema = z.enum(['PASS', 'FAIL']);
const ConfidenceLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
const ConcernLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
const AppliedThresholdSchema = z.enum(['STANDARD_80', 'ELEVATED_85']);
const AssessmentSchema = z.enum(['ACCEPTABLE', 'CONCERNING']);
const SeveritySchema = z.enum(['MINOR', 'MODERATE']);
const SamplingImpactSchema = z.enum(['NONE', 'ADD_NOTES', 'TRIGGER_REVISION']);

// Cross-reference result enums
const S1S5ResultSchema = z.enum(['ALIGNED', 'PARTIAL', 'MISALIGNED']);
const S2S5ResultSchema = z.enum(['PRESERVED', 'DILUTED', 'LOST']);
const S2S6ResultSchema = z.enum(['TESTED', 'PARTIAL', 'GENERIC']);
const S3S5ResultSchema = z.enum(['FAITHFUL', 'MINOR_DEV', 'MAJOR_DEV']);
const S3S6ResultSchema = z.enum(['REALIZED', 'PARTIAL', 'IGNORED']);
const S5S6ResultSchema = z.enum(['CALIBRATED', 'MINOR_MISMATCH', 'SIGNIFICANT']);

// ============================================================================
// COURSE SUMMARY
// ============================================================================

const TargetPersonaSchema = z.object({
  who: z.string(),
  struggle: z.string(),
  desired_outcome: z.string(),
});

const CourseSummarySchema = z.object({
  course_title: z.string(),
  source_book: z.string(),
  total_episodes: z.number(),
  total_practice_sessions: z.number(),
  target_persona: TargetPersonaSchema,
  s1_behavioral_impact: z.string(),
  s2_core_promise: z.string(),
  s2_why_this_idea_wins: z.string(),
});

// ============================================================================
// CONFIDENCE INHERITANCE
// ============================================================================

const ConfidenceInheritanceSchema = z.object({
  s1_confidence_level: ConfidenceLevelSchema,
  applied_threshold: AppliedThresholdSchema,
  scrutiny_notes: z.string(),
});

// ============================================================================
// CRITICAL GATES
// ============================================================================

const OneSentenceTestSchema = z.object({
  episodes_passing: z.number(),
  episodes_total: z.number(),
});

const CriticalGateSchema = z.object({
  gate_number: z.number().min(1).max(6),
  gate_name: z.string(),
  result: GateResultSchema,
  evidence: z.string(),
  fail_reason: z.string().nullable(),
  // Optional fields for specific gates
  objectives_covered: z.number().optional(),
  objectives_total: z.number().optional(),
  key_points_preserved: z.number().optional(),
  key_points_total: z.number().optional(),
  skills_practiced: z.number().optional(),
  skills_taught: z.number().optional(),
  one_sentence_test: OneSentenceTestSchema.optional(),
});

const CriticalGatesSummarySchema = z.object({
  total_passed: z.number(),
  total_failed: z.number(),
  all_passed: z.boolean(),
  failed_gates: z.array(z.string()),
});

const CriticalGatesSchema = z.object({
  gates: z.array(CriticalGateSchema).length(6),
  summary: CriticalGatesSummarySchema,
});

// ============================================================================
// QUALITY SCORES - 4 Dimensions × 25 points = 100 total
// ============================================================================

const ContentEngagementBreakdownSchema = z.object({
  hooks: z.number().min(0).max(5),
  flow_rhythm: z.number().min(0).max(7),
  memorability: z.number().min(0).max(7),
  engagement_maintenance: z.number().min(0).max(6),
});

const PedagogicalSoundnessBreakdownSchema = z.object({
  learning_arc: z.number().min(0).max(7),
  concept_clarity: z.number().min(0).max(7),
  skill_building: z.number().min(0).max(6),
  reinforcement: z.number().min(0).max(5),
});

const PracticeEffectivenessBreakdownSchema = z.object({
  scenario_realism: z.number().min(0).max(7),
  question_quality: z.number().min(0).max(6),
  answer_design: z.number().min(0).max(6),
  feedback_quality: z.number().min(0).max(6),
});

const ProductionPolishBreakdownSchema = z.object({
  completeness: z.number().min(0).max(7),
  consistency: z.number().min(0).max(7),
  format_compliance: z.number().min(0).max(6),
  professional_quality: z.number().min(0).max(5),
});

const DimensionScoreSchema = z.object({
  score: z.number().min(0).max(25),
  max: z.literal(25),
  notes: z.string(),
});

const ContentEngagementSchema = DimensionScoreSchema.extend({
  breakdown: ContentEngagementBreakdownSchema,
});

const PedagogicalSoundnessSchema = DimensionScoreSchema.extend({
  breakdown: PedagogicalSoundnessBreakdownSchema,
});

const PracticeEffectivenessSchema = DimensionScoreSchema.extend({
  breakdown: PracticeEffectivenessBreakdownSchema,
});

const ProductionPolishSchema = DimensionScoreSchema.extend({
  breakdown: ProductionPolishBreakdownSchema,
});

const QualityDimensionsSchema = z.object({
  content_engagement: ContentEngagementSchema,
  pedagogical_soundness: PedagogicalSoundnessSchema,
  practice_effectiveness: PracticeEffectivenessSchema,
  production_polish: ProductionPolishSchema,
});

const QualityScoresSchema = z.object({
  evaluated: z.boolean(),
  skip_reason: z.string().nullable(),
  dimensions: QualityDimensionsSchema.optional(),
  total_score: z.number().min(0).max(100).optional(),
  threshold_applied: z.number().optional(),
  is_borderline: z.boolean().optional(),
  score_verdict: z.string().optional(),
});

// ============================================================================
// CROSS-REFERENCE CHECKS
// ============================================================================

const CrossReferenceCheckSchema = z.object({
  check: z.string(),
  result: z.string(), // Union of different result types
  concern_level: ConcernLevelSchema,
  notes: z.string(),
});

const CrossReferenceChecksSchema = z.object({
  checks: z.array(CrossReferenceCheckSchema).length(6),
  status: z.enum(['ALL_CLEAR', 'CONCERNS_NOTED']),
  high_concern_count: z.number(),
});

// ============================================================================
// TARGETED SAMPLING
// ============================================================================

const WeakEpisodeSampleSchema = z.object({
  episode_number: z.number(),
  episode_title: z.string(),
  assessment: AssessmentSchema,
  one_sentence_test: GateResultSchema,
  findings: z.string(),
});

const AdvancedPracticeSampleSchema = z.object({
  practice_id: z.string(),
  assessment: AssessmentSchema,
  findings: z.string(),
});

const S4S5TransformationSampleSchema = z.object({
  episode_number: z.number(),
  assessment: AssessmentSchema,
  findings: z.string(),
});

const SamplesSchema = z.object({
  weak_episode: WeakEpisodeSampleSchema,
  advanced_practice: AdvancedPracticeSampleSchema,
  s4_s5_transformation: S4S5TransformationSampleSchema,
});

const TargetedSamplingSchema = z.object({
  performed: z.boolean(),
  mandatory: z.boolean(),
  samples: SamplesSchema.optional(),
  status: z.enum(['ALL_ACCEPTABLE', 'CONCERNS_FOUND']),
  impact: SamplingImpactSchema,
});

// ============================================================================
// FINAL VERDICT
// ============================================================================

const FinalVerdictSchema = z.object({
  verdict: FinalVerdictTypeSchema,
  verdict_reasoning: z.string(),
  deployment_ready: z.boolean(),
  confidence: ConfidenceLevelSchema,
});

// ============================================================================
// POST-LAUNCH MONITORING
// ============================================================================

const PostLaunchMonitoringSchema = z.object({
  flagged: z.boolean(),
  flag_reasons: z.array(z.string()),
  monitoring_actions: z.array(z.string()),
});

// ============================================================================
// REVISION GUIDANCE
// ============================================================================

const RevisionIssueSchema = z.object({
  priority: z.number().min(1).max(3),
  description: z.string(),
  step_to_revise: z.enum(['S3', 'S4', 'S5', 'S6']),
  specific_fix: z.string(),
  downstream_impact: z.string(),
});

const RevisionLoopSchema = z.object({
  start_from: z.string(),
  steps_to_rerun: z.array(z.string()),
  return_to: z.literal('S7'),
});

const RevisionGuidanceSchema = z.object({
  applicable: z.boolean(),
  issues: z.array(RevisionIssueSchema).optional(),
  revision_loop: RevisionLoopSchema.optional(),
  do_not_change: z.array(z.string()).optional(),
});

// ============================================================================
// NOTES DOCUMENTATION
// ============================================================================

const NoteItemSchema = z.object({
  observation: z.string(),
  severity: SeveritySchema,
  recommendation: z.string(),
});

const NotesDocumentationSchema = z.object({
  applicable: z.boolean(),
  mandatory: z.boolean(),
  notes: z.array(NoteItemSchema).optional(),
});

// ============================================================================
// EVALUATION METADATA
// ============================================================================

const EvaluationMetadataSchema = z.object({
  timestamp: z.string(),
  pipeline_version: z.string(),
});

// ============================================================================
// MAIN S7 RESPONSE SCHEMA
// ============================================================================

export const S7ResponseSchema = z.object({
  final_evaluation: z.object({
    course_summary: CourseSummarySchema,
    confidence_inheritance: ConfidenceInheritanceSchema,
    critical_gates: CriticalGatesSchema,
    quality_scores: QualityScoresSchema,
    cross_reference_checks: CrossReferenceChecksSchema,
    targeted_sampling: TargetedSamplingSchema,
    final_verdict: FinalVerdictSchema,
    post_launch_monitoring: PostLaunchMonitoringSchema,
    revision_guidance: RevisionGuidanceSchema,
    notes_documentation: NotesDocumentationSchema,
    evaluation_metadata: EvaluationMetadataSchema,
  }),
});

export type S7Response = z.infer<typeof S7ResponseSchema>;
