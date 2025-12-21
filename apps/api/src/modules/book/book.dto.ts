import { z } from 'zod';

export const S1VerdictEnum = z.enum(['DIAMOND', 'GOLD', 'REJECTED']);
export const S1VerdictConfidenceEnum = z.enum(['HIGH', 'MEDIUM', 'LOW']);

export const RegisterBookSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, { message: 'Description is required' }),
  bookLink: z.string().url({ message: 'bookLink must be a valid URL' }).optional(),
  language: z.string().min(2).max(10).default('en'),
});

export type RegisterBookDto = z.infer<typeof RegisterBookSchema>;

const booleanPreprocess = z.preprocess((value) => {
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return value;
}, z.boolean());

export const ListBooksQuerySchema = z.object({
  verdict: S1VerdictEnum.optional(),
  isPipelineEligible: booleanPreprocess.optional(),
  search: z.string().min(1).optional(),
  page: z.preprocess(
    (val) => (val === undefined ? 1 : Number(val)),
    z.number().int().positive().default(1),
  ),
  pageSize: z.preprocess(
    (val) => (val === undefined ? 20 : Number(val)),
    z.number().int().min(1).max(100).default(20),
  ),
});

export type ListBooksQueryDto = z.infer<typeof ListBooksQuerySchema>;

export const S1ScoringItemSchema = z.object({
  score: z.number().min(0).max(25),
  reasoning: z.string(),
});

// Allow null values for scoring items when verdict is REJECTED
const NullableScoringItem = z.union([S1ScoringItemSchema, z.number(), z.null()]);

export const S1EvaluationSchema = z.object({
  verdict: S1VerdictEnum,
  verdictConfidence: S1VerdictConfidenceEnum,
  totalScore: z.number().min(0).max(100).nullable(),
  scoring: z.object({
    softSkillRelevance: NullableScoringItem.optional(),
    audioAdaptability: NullableScoringItem.optional(),
    microLearningFit: NullableScoringItem.optional(),
    contentQuality: NullableScoringItem.optional(),
    practicalApplicability: NullableScoringItem.optional(),
    contentDepth: NullableScoringItem.optional(),
    targetAudienceFit: NullableScoringItem.optional(),
  }),
  primarySpi: z.object({
    id: z.union([z.number(), z.string(), z.null()]),
    name: z.string().nullable(),
    confidence: S1VerdictConfidenceEnum.optional(),
  }),
  behavioralImpactStatement: z.string().nullable(),
  greenFlags: z.array(z.string()),
  redFlags: z.array(z.string()),
  recommendedEpisodeCount: z.number().min(0).max(20).nullable(),
  layer1Gates: z
    .object({
      actionability: z
        .object({
          result: z.enum(['PASS', 'FAIL']),
          confidence: S1VerdictConfidenceEnum,
          evidence: z.string().optional(),
        })
        .optional(),
      audioViability: z
        .object({
          result: z.enum(['PASS', 'FAIL']),
          confidence: S1VerdictConfidenceEnum,
          evidence: z.string().optional(),
        })
        .optional(),
      practiceGeneratability: z
        .object({
          result: z.enum(['PASS', 'FAIL']),
          confidence: S1VerdictConfidenceEnum,
          evidence: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  rejectionReason: z.string().nullable().optional(),
  notes: z.string().optional(),
});

export type S1Evaluation = z.infer<typeof S1EvaluationSchema>;

export interface RegisterBookResponse {
  bookId: string;
  title: string;
  s1Verdict: z.infer<typeof S1VerdictEnum>;
  // LLM scoring can be absent; keep API contract nullable to match source
  s1Score: number | null;
  s1VerdictConfidence: z.infer<typeof S1VerdictConfidenceEnum>;
  isPipelineEligible: boolean;
  s1Summary: {
    primarySpiName: string;
    behavioralImpactStatement: string;
    greenFlags: string[];
    redFlags: string[];
  };
  evaluatedAt: string;
}

export interface BookDetailResponse {
  id: string;
  title: string;
  description: string | null;
  bookLink: string | null;
  language: string;
  s1Verdict: string | null;
  s1Score: number | null;
  s1VerdictConfidence: string | null;
  isPipelineEligible: boolean;
  chaptersLocked: boolean;
  totalChapters: number;
  totalWordCount: number;
  pipelineStatus: string | null;
  createdAt: string;
  createdBy: { id: string; displayName: string | null };
}

export interface BookSummary {
  id: string;
  title: string;
  s1Verdict: string | null;
  s1Score: number | null;
  s1VerdictConfidence: string | null;
  isPipelineEligible: boolean;
  pipelineStatus: string | null;
  createdAt: string;
}

export interface ListBooksResponse {
  books: BookSummary[];
  total: number;
  page: number;
  pageSize: number;
}
