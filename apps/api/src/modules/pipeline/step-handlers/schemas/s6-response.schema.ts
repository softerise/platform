import { z } from 'zod';

// Answer quality enum - THREE-TIER SYSTEM
const AnswerQualitySchema = z.enum(['BEST', 'ACCEPTABLE', 'POOR']);

// Practice session level enum
const SessionLevelSchema = z.enum(['BASIC', 'INTERMEDIATE', 'ADVANCED']);

// Stakes level enum
const StakesLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

// Question format enum
const QuestionFormatSchema = z.enum([
    'IMMEDIATE_RESPONSE',
    'STRATEGIC_CHOICE',
    'INTERNAL_PROCESS',
    'BEHAVIORAL_ACTION',
    'COMMUNICATION_APPROACH',
    'FOLLOW_UP',
    'PERSPECTIVE_TAKING',
]);

// Target persona schema
const TargetPersonaSchema = z.object({
    who: z.string(),
    struggle: z.string(),
    desired_outcome: z.string(),
});

// Course metadata schema
const CourseMetadataSchema = z.object({
    course_title: z.string(),
    core_promise: z.string(),
    target_persona: TargetPersonaSchema,
});

// Skills inventory schema
const SkillsInventorySchema = z.object({
    foundational_skills: z.array(z.string()),
    combined_skills: z.array(z.string()),
    integrated_skills: z.array(z.string()),
    total_skills_to_cover: z.number().min(1),
});

// Scenario schema
const ScenarioSchema = z.object({
    situation: z.string().min(20),
    context: z.string(),
    stakes: StakesLevelSchema,
});

// Answer schema
const AnswerSchema = z.object({
    answer_id: z.string(),
    answer_text: z.string().min(10),
    answer_quality: AnswerQualitySchema,
    is_correct: z.boolean(),
    feedback: z.string().min(20), // 30-50 words requirement
});

// Question schema
const QuestionSchema = z.object({
    question_id: z.string(),
    question_format: QuestionFormatSchema,
    skill_focus: z.string(),
    question_text: z.string().min(10),
    answers: z.array(AnswerSchema).length(3),
});

// Session validation schema
const SessionValidationSchema = z.object({
    scenario_just_right: z.boolean(),
    question_format_variety: z.boolean(),
    poor_answers_plausible: z.boolean(),
    all_feedback_references_concepts: z.boolean(),
});

// Practice session schema
const PracticeSessionSchema = z.object({
    practice_id: z.string(),
    level: SessionLevelSchema,
    level_description: z.string(),
    skills_tested: z.array(z.string()).min(1),
    episode_relevance: z.array(z.number().min(1).max(10)),
    scenario: ScenarioSchema,
    questions: z.array(QuestionSchema).length(3),
    session_validation: SessionValidationSchema,
});

// Skills coverage item schema
const SkillsCoverageSchema = z.object({
    skill: z.string(),
    tested_in: z.array(z.string()),
    coverage_count: z.number().min(1),
});

// Coverage matrix schema
const CoverageMatrixSchema = z.object({
    skills_coverage: z.array(SkillsCoverageSchema),
    all_skills_covered: z.boolean(),
    minimum_coverage_met: z.boolean(),
});

// Variety validation schema
const VarietyValidationSchema = z.object({
    relationship_types_used: z.array(z.string()),
    situation_types_used: z.array(z.string()),
    emotional_contexts_used: z.array(z.string()),
    sufficient_variety: z.boolean(),
});

// Quality gate schema with issues array
const QualityGateSchema = z.object({
    gate: z.string(),
    status: z.enum(['PASS', 'FAIL']),
    issues: z.array(z.string()).optional(),
    untested: z.array(z.string()).optional(),
    misaligned: z.array(z.string()).optional(),
});

// Quality validation schema
const QualityValidationSchema = z.object({
    gates: z.array(QualityGateSchema).min(6), // 6 gates required
    overall_status: z.enum(['READY_FOR_PRODUCTION', 'NEEDS_REVISION']),
});

// Statistics schema
const StatisticsSchema = z.object({
    total_practice_sessions: z.number(),
    total_questions: z.number(),
    total_answer_options: z.number(),
    total_feedback_items: z.number(),
    question_formats_used: z.array(z.string()),
    avg_feedback_word_count: z.number(),
});

// Main S6 response schema
export const S6ResponseSchema = z.object({
    practice_content: z.object({
        course_metadata: CourseMetadataSchema,
        skills_inventory: SkillsInventorySchema,
        practice_sessions: z.array(PracticeSessionSchema).length(9),
        coverage_matrix: CoverageMatrixSchema,
        variety_validation: VarietyValidationSchema,
        quality_validation: QualityValidationSchema,
        statistics: StatisticsSchema,
        ready_for_production: z.boolean(),
        revision_notes: z.string().nullable().optional(),
        processing_timestamp: z.string(),
    }),
});

export type S6Response = z.infer<typeof S6ResponseSchema>;
