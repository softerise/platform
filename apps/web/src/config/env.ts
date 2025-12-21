import { z } from 'zod';

const envSchema = z
  .object({
    SANITY_PROJECT_ID: z.string().min(1, 'SANITY_PROJECT_ID is required').optional(),
    SANITY_DATASET: z.string().min(1, 'SANITY_DATASET is required').optional(),
    PUBLIC_API_URL: z.string().url('PUBLIC_API_URL must be a valid URL').optional(),
    SANITY_READ_TOKEN: z.string().optional(),
  })
  .passthrough();

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  // Keep build running even when env is missing; content fetch falls back to empty state.
  const message = parsed.error.errors
    .map((issue) => `${issue.path.join('.') || 'ENV'}: ${issue.message}`)
    .join('; ');
  console.warn(
    `Invalid or missing environment variables for Web app. ${message}. Falling back to demo state.`,
  );
}

export type WebEnv = z.infer<typeof envSchema>;

export const env: WebEnv = parsed.success ? parsed.data : {};
export const hasSanityEnv = Boolean(env.SANITY_PROJECT_ID && env.SANITY_DATASET);

