import { z } from 'zod';

const TargetPersonaSchema = z.object({
  who: z.string(),
  level: z.string(),
  situation: z.string(),
});

const KeyPointSchema = z.object({
  point: z.string(),
  purpose: z.enum(['TOOL', 'DECISION', 'MISTAKE']),
});

const EvidenceTextRefSchema = z.object({
  id: z.string(),
  assigned_placement: z.enum(['HOOK', 'CORE', 'APPLICATION', 'TAKEAWAY']),
});

const AssignedContentSchema = z.object({
  strategies: z.array(z.string()).default([]),
  methods: z.array(z.string()).default([]),
  frameworks: z.array(z.string()).default([]),
  research: z.array(z.string()).default([]),
  stories: z.array(z.string()).default([]),
  evidence_texts: z.array(EvidenceTextRefSchema).default([]),
});

const FoundationalMicroBehaviorSchema = z.object({
  applicable: z.boolean(),
  signal: z.string().nullable().optional(),
  action: z.string().nullable().optional(),
  check: z.string().nullable().optional(),
});

const KeyPointExpandedSchema = z.object({
  key_point: z.string(),
  purpose: z.enum(['TOOL', 'DECISION', 'MISTAKE']),
  expansion_summary: z.string(),
});

const ContentIntegratedSchema = z.object({
  methods: z.array(z.string()).default([]),
  frameworks: z.array(z.string()).default([]),
  research: z.array(z.string()).default([]),
});

const MicroBehaviorIncludedSchema = z.object({
  applicable: z.boolean(),
  try_this: z.string().nullable().optional(),
  notice_this: z.string().nullable().optional(),
  ask_yourself: z.string().nullable().optional(),
});

const EvidenceTextIntegrationSchema = z.object({
  id: z.string(),
  assigned_placement: z.enum(['HOOK', 'CORE', 'APPLICATION', 'TAKEAWAY']),
  actual_placement: z.enum(['HOOK', 'CORE', 'APPLICATION', 'TAKEAWAY']),
  full_markup: z.string(),
  status: z.enum(['INTEGRATED', 'MISSING']),
});

const QualityGateSchema = z.object({
  gate: z.string(),
  status: z.enum(['PASS', 'FAIL']),
  details: z.string().nullable().optional(),
  indicator_count: z.number().optional(),
  instances: z.array(z.string()).optional(),
});

const TransitionHintsSchema = z.object({
  hook_to_core: z.string(),
  core_to_application: z.string(),
  application_to_takeaway: z.string(),
});

const S5HandoffSchema = z.object({
  transition_hints: TransitionHintsSchema,
  audio_emphasis_points: z.array(z.string()).default([]),
  micro_behavior_format: z.string().nullable().optional(),
  total_word_count: z.number(),
});

export const S4ResponseSchema = z.object({
  episode_draft: z.object({
    metadata: z.object({
      episode_number: z.number().min(1).max(10),
      episode_title: z.string(),
      episode_type: z.enum(['FOUNDATIONAL', 'CORE', 'APPLICATION', 'INTEGRATION']),
      total_episodes: z.number().min(5).max(10),
      learning_objective: z.string(),
      course_title: z.string(),
      target_persona: TargetPersonaSchema.optional(),
    }),
    s3_reference: z.object({
      key_points: z.array(KeyPointSchema).min(3).max(5),
      assigned_content: AssignedContentSchema,
      foundational_micro_behavior: FoundationalMicroBehaviorSchema.optional(),
      practice_connection_hint: z.string().optional(),
    }),
    draft_content: z.object({
      hook: z.object({
        content: z.string().min(20),
        word_count: z.number().min(0),
        evidence_texts_used: z.array(z.string()).default([]),
        transition_hint: z.string(),
      }),
      core_teaching: z.object({
        content: z.string().min(100),
        word_count: z.number().min(0),
        key_points_expanded: z.array(KeyPointExpandedSchema).min(3),
        content_integrated: ContentIntegratedSchema,
        evidence_texts_used: z.array(z.string()).default([]),
        transition_hint: z.string(),
      }),
      application: z.object({
        content: z.string().min(50),
        word_count: z.number().min(0),
        stories_integrated: z.array(z.string()).default([]),
        evidence_texts_used: z.array(z.string()).default([]),
        micro_behavior_included: MicroBehaviorIncludedSchema.optional(),
        transition_hint: z.string(),
      }),
      takeaway: z.object({
        content: z.string().min(20),
        word_count: z.number().min(0),
        evidence_texts_used: z.array(z.string()).default([]),
      }),
    }),
    word_count_summary: z.object({
      hook: z.number(),
      core_teaching: z.number(),
      application: z.number(),
      takeaway: z.number(),
      total: z.number(),
      target_range: z.string(),
      status: z.enum(['WITHIN_RANGE', 'UNDER', 'OVER']),
    }),
    evidence_text_integration: z.array(EvidenceTextIntegrationSchema).default([]),
    quality_validation: z.object({
      gates: z.array(QualityGateSchema),
      overall_status: z.enum(['ALL_PASS', 'NEEDS_REVISION']),
    }),
    ready_for_s5: z.boolean(),
    revision_notes: z.string().nullable().optional(),
    s5_handoff: S5HandoffSchema,
    processing_timestamp: z.string(),
  }),
});

export type S4Response = z.infer<typeof S4ResponseSchema>;
