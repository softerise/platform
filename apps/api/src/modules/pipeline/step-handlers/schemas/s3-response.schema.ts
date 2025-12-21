import { z } from 'zod';

// More lenient key point schema
const KeyPointSchema = z.object({
  point: z.string().optional().default(''),
  purpose: z.string().optional().default('TOOL'), // Was enum, now string
  text: z.string().optional(), // Alternative field name
  type: z.string().optional(), // Alternative field name
}).passthrough();

// More lenient practice connection schema
const PracticeConnectionSchema = z.object({
  context: z.string().optional().default(''),
  behavior: z.string().optional().default(''),
  difficulty: z.string().optional().default('BASIC'), // Was enum, now string
}).passthrough();

// More lenient episode schema
const EpisodeSchema = z.object({
  episode_number: z.number().optional().default(1),
  episode_title: z.string().optional().default(''),
  title: z.string().optional(), // Alternative field name
  episode_type: z.string().optional().default('CORE'), // Was enum, now string
  type: z.string().optional(), // Alternative field name
  estimated_duration: z.string().optional().default('5-7 minutes'),
  dependencies: z.array(z.number()).optional().default([]),
  learning_objective: z.string().optional().default(''),
  behavioral_clarity: z.string().optional().default('CLEAR'), // Was enum, now string
  key_points: z.array(KeyPointSchema).optional().default([]),
  practice_connection: PracticeConnectionSchema.optional(),
  pain_points_addressed: z.array(z.string()).optional().default([]),
}).passthrough();

// More lenient skills summary schema
const SkillsSummarySchema = z.object({
  foundational_skills: z.array(z.string()).optional().default([]),
  combined_skills: z.array(z.string()).optional().default([]),
  integrated_skills: z.array(z.string()).optional().default([]),
  total_skills_count: z.number().optional().default(0),
}).passthrough();

// Quality gate schema - more lenient
const QualityGateSchema = z.object({
  gate: z.string().optional().default(''),
  name: z.string().optional(), // Alternative field name
  status: z.string().optional().default('PASS'), // Was enum, now string
  notes: z.string().nullable().optional(),
  note: z.string().nullable().optional(), // Alternative field name
}).passthrough();

// Target persona sub-schema
const TargetPersonaSchema = z.object({
  who: z.string().optional().default(''),
  level: z.string().optional().default(''),
  situation: z.string().optional().default(''),
  struggle: z.string().optional().default(''),
  desired_outcome: z.string().optional().default(''),
}).passthrough();

// Source data schema - more lenient
const SourceDataSchema = z.object({
  book_title: z.string().optional().default(''),
  idea_id: z.string().optional().default(''),
  idea_title: z.string().optional().default(''),
  core_promise: z.string().optional().default(''),
  target_persona: TargetPersonaSchema.optional(),
  pain_points: z.array(z.any()).optional().default([]),
}).passthrough();

// Course parameters schema - more lenient
const CourseParametersSchema = z.object({
  final_episode_count: z.number().optional().default(0),
  structure_type: z.string().optional().default('HYBRID'), // Was literal, now string
  estimated_total_duration: z.string().optional().default('unknown'),
}).passthrough();

// Quality validation schema - more lenient
const QualityValidationSchema = z.object({
  gates: z.array(QualityGateSchema).optional().default([]),
  overall: z.string().optional().default('NEEDS_REVISION'), // Was enum, now string
  overallStatus: z.string().optional(), // Alternative field name
  revision_notes: z.string().nullable().optional(),
}).passthrough();

// S4 input data schema - very lenient
const S4InputDataSchema = z.object({
  course_title: z.string().optional().default(''),
  core_promise: z.string().optional().default(''),
  total_episodes: z.number().optional().default(0),
  episodes: z.array(z.any()).optional().default([]),
  skills_summary: SkillsSummarySchema.optional(),
}).passthrough();

export const S3ResponseSchema = z.object({
  course_outline: z.object({
    source_data: SourceDataSchema.optional(),
    course_parameters: CourseParametersSchema.optional(),
    episodes: z.array(EpisodeSchema).optional().default([]),
    skills_summary: SkillsSummarySchema.optional(),
    quality_validation: QualityValidationSchema.optional(),
    proceed_to_s4: z.boolean().optional().default(false),
    s4_input_data: S4InputDataSchema.optional(),
  }).passthrough(),
});

export type S3Response = z.infer<typeof S3ResponseSchema>;
