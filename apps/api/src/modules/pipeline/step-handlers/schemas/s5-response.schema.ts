import { z } from 'zod';

const StyleSignalsSchema = z.object({
  sentence_length: z.enum(['SHORT', 'MEDIUM', 'VARIED']),
  explanation_style: z.enum(['CONCRETE', 'ABSTRACT', 'BALANCED']),
  tone: z.enum(['WARM', 'DIRECT', 'MEASURED', 'ENERGETIC']),
  rhythm: z.enum(['PUNCHY', 'FLOWING', 'VARIED']),
});

const PlatformConflictSchema = z.object({
  signal: z.string(),
  resolution: z.string(),
});

const AudioScriptSectionSchema = z.object({
  content: z.string().min(20),
  word_count: z.number().min(0),
});

const TransitionSchema = z.object({
  content: z.string(),
  word_count: z.number().min(0),
});

const KeyPointDeliveredSchema = z.object({
  point: z.string(),
  purpose: z.enum(['TOOL', 'DECISION', 'MISTAKE']),
  confirmed: z.boolean(),
});

const MicroBehaviorDeliveredSchema = z.object({
  included: z.boolean(),
  try_this: z.string().nullable().optional(),
  notice_this: z.string().nullable().optional(),
  ask_yourself: z.string().nullable().optional(),
});

const EvidenceTextDeliveredSchema = z.object({
  id: z.string(),
  placement: z.enum(['HOOK', 'CORE', 'APPLICATION', 'TAKEAWAY']),
  full_delivery: z.string(),
  format_compliant: z.boolean(),
});

// Updated quality gate schema to support all 8 gates with their specific fields
const QualityGateSchema = z.object({
  gate: z.string(),
  status: z.enum(['PASS', 'FAIL']),
  details: z.string().nullable().optional(),
  // For Audio Readability gate
  avg_sentence_length: z.number().optional(),
  issues: z.array(z.string()).optional(),
  // For Listener Engagement gate
  we_count: z.number().optional(),
  you_count: z.number().optional(),
  // For Audio Monotony gate
  rhythm: z.enum(['VARIED', 'MONOTONOUS']).optional(),
  // For Conversational Boundary gate
  violations: z.number().optional(),
});

const MarkerSummarySchema = z.object({
  pause_count: z.number(),
  emphasis_count: z.number(),
});

export const S5ResponseSchema = z.object({
  episode_content: z.object({
    metadata: z.object({
      episode_number: z.number().min(1).max(10),
      episode_title: z.string(),
      episode_type: z.enum(['FOUNDATIONAL', 'CORE', 'APPLICATION', 'INTEGRATION']),
      total_episodes: z.number().min(5).max(10),
      learning_objective: z.string(),
      course_title: z.string(),
    }),
    style_analysis: z.object({
      detected_signals: StyleSignalsSchema,
      platform_conflicts: z.array(PlatformConflictSchema).default([]),
      application_notes: z.string(),
    }),
    audio_script: z.object({
      hook: AudioScriptSectionSchema.extend({
        opening_style: z.enum(['SITUATION', 'PROBLEM']),
      }),
      transition_hook_to_core: TransitionSchema,
      core_teaching: z.object({
        content: z.string().min(100),
        word_count: z.number().min(0),
        key_points_delivered: z.array(KeyPointDeliveredSchema).min(3),
        pause_markers_used: z.number(),
      }),
      transition_core_to_application: TransitionSchema,
      application: z.object({
        content: z.string().min(50),
        word_count: z.number().min(0),
        story_delivered: z.boolean(),
        micro_behavior: MicroBehaviorDeliveredSchema,
      }),
      transition_application_to_takeaway: TransitionSchema,
      takeaway: z.object({
        content: z.string().min(20),
        word_count: z.number().min(0),
        new_information_added: z.boolean(),
      }),
      practice_bridge: z.object({
        content: z.string(),
        word_count: z.number().min(0),
      }),
    }),
    evidence_texts_delivered: z.array(EvidenceTextDeliveredSchema).default([]),
    word_count_summary: z.object({
      hook: z.number(),
      transitions_total: z.number(),
      core_teaching: z.number(),
      application: z.number(),
      takeaway: z.number(),
      practice_bridge: z.number(),
      total: z.number(),
      status: z.enum(['COMPLIANT', 'UNDER', 'OVER']),
    }),
    quality_validation: z.object({
      gates: z.array(QualityGateSchema).min(8), // Now 8 gates required
      overall_status: z.enum(['ALL_PASS', 'NEEDS_REVISION']),
    }),
    production_output: z.object({
      text_content: z.string(),
      total_word_count: z.number(),
      estimated_duration_minutes: z.number(),
      marker_summary: MarkerSummarySchema,
      platform_persona_maintained: z.boolean(),
    }),
    ready_for_production: z.boolean(),
    revision_notes: z.string().nullable().optional(),
    processing_timestamp: z.string(),
  }),
});

export type S5Response = z.infer<typeof S5ResponseSchema>;
